"""
Flask API Backend for COVID-19 Tweets Analysis
Serves ML models and provides endpoints for frontend
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import pickle
import torch
from transformers import BertTokenizer, BertForSequenceClassification
import os
from datetime import datetime, timedelta
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Load models and data
print("Loading models and data...")

# Load processed data
df = None
daily_trends = None
location_stats = None

try:
    # Load main tweets data
    df = pd.read_csv('data/processed/covid19_tweets_with_predictions.csv')
    df['date'] = pd.to_datetime(df['date'])
    print(f"✓ Loaded {len(df):,} tweets")

    # Load daily trends
    daily_trends = pd.read_csv('data/processed/daily_trends.csv')
    daily_trends['date'] = pd.to_datetime(daily_trends['date'])
    print(f"✓ Loaded daily trends")

    # Load location statistics
    location_stats = pd.read_csv('data/processed/location_statistics.csv')
    print(f"✓ Loaded location statistics")

except Exception as e:
    print(f"Error loading data: {e}")

# Load models
models = {}
try:
    # Load classifiers
    if os.path.exists('data/models/rf_tuned.pkl'):
        with open('data/models/rf_tuned.pkl', 'rb') as f:
            models['random_forest'] = pickle.load(f)
        print("✓ Loaded Random Forest model")

    if os.path.exists('data/models/lr_tuned.pkl'):
        with open('data/models/lr_tuned.pkl', 'rb') as f:
            models['logistic_regression'] = pickle.load(f)
        print("✓ Loaded Logistic Regression model")

    if os.path.exists('data/models/xgb_classifier.pkl'):
        with open('data/models/xgb_classifier.pkl', 'rb') as f:
            models['xgboost'] = pickle.load(f)
        print("✓ Loaded XGBoost model")

    # Load BERT tokenizer and base model for text processing
    from transformers import BertModel
    models['tokenizer'] = BertTokenizer.from_pretrained('bert-base-uncased')
    models['bert_base'] = BertModel.from_pretrained('bert-base-uncased')
    models['bert_base'].eval()
    print("✓ Loaded BERT tokenizer and base model")

    print("✓ All available models loaded successfully")
except Exception as e:
    print(f"Error loading models: {e}")

# Symptom categories (from Phase 2)
SYMPTOM_CATEGORIES = {
    'Fever': ['fever', 'temperature', 'hot', 'burning', 'chills', 'shivering'],
    'Respiratory': ['cough', 'breathing', 'breathless', 'shortness of breath', 'chest pain', 'pneumonia'],
    'Fatigue': ['tired', 'fatigue', 'exhausted', 'weak', 'weakness'],
    'Loss of Senses': ['loss of taste', 'loss of smell', 'smell', 'taste', 'anosmia'],
    'Body Pain': ['body aches', 'muscle pain', 'joint pain', 'ache', 'pain', 'sore'],
    'Throat': ['sore throat', 'throat pain', 'throat'],
    'Headache': ['headache', 'head pain', 'migraine'],
    'Gastrointestinal': ['nausea', 'vomiting', 'diarrhea', 'stomach'],
    'Other': ['dizzy', 'rash', 'congestion', 'runny nose']
}

def preprocess_text(text):
    """Preprocess text like in training"""
    import re
    text = str(text).lower()
    text = re.sub(r'http\S+|www\S+|https\S+', '', text)
    text = re.sub(r'@\w+', '', text)
    text = re.sub(r'#', '', text)
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_symptoms(text):
    """Extract symptoms from text"""
    text = str(text).lower()
    found_symptoms = {}
    for category, symptoms in SYMPTOM_CATEGORIES.items():
        found = [s for s in symptoms if s in text]
        if found:
            found_symptoms[category] = found
    return found_symptoms

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'models_loaded': len(models) > 0,
        'data_loaded': df is not None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get overall statistics"""
    if df is None:
        return jsonify({'error': 'Data not loaded'}), 500

    # Get sentiment based on simple heuristic
    positive_count = 0
    negative_count = 0
    if 'sentiment' in df.columns:
        positive_count = int((df['sentiment'] == 'POSITIVE').sum())
        negative_count = int((df['sentiment'] == 'NEGATIVE').sum())
    else:
        # Simple keyword-based sentiment
        positive_keywords = ['good', 'better', 'recover', 'hope', 'positive']
        negative_keywords = ['bad', 'worse', 'sick', 'death', 'fear', 'negative']
        for text in df['cleaned_text']:
            text_lower = str(text).lower()
            if any(word in text_lower for word in positive_keywords):
                positive_count += 1
            if any(word in text_lower for word in negative_keywords):
                negative_count += 1

    stats = {
        'total_tweets': int(len(df)),
        'disease_tweets': int(df['label'].sum()),
        'locations': int(location_stats['cleaned_location'].nunique()) if location_stats is not None else 0,
        'date_range': {
            'start': df['date'].min().strftime('%Y-%m-%d'),
            'end': df['date'].max().strftime('%Y-%m-%d')
        },
        'positive_sentiment': positive_count,
        'negative_sentiment': negative_count
    }

    return jsonify(stats)

@app.route('/api/analyze', methods=['POST'])
def analyze_tweet():
    """Analyze a single tweet for disease detection"""
    data = request.get_json()
    text = data.get('text', '')

    if not text:
        return jsonify({'error': 'No text provided'}), 400

    try:
        # Preprocess
        cleaned_text = preprocess_text(text)

        # Get BERT embedding for the text
        encoded = models['tokenizer'].encode_plus(
            cleaned_text,
            add_special_tokens=True,
            max_length=128,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt'
        )

        # Use pre-loaded BERT model to get embeddings
        with torch.no_grad():
            outputs = models['bert_base'](
                encoded['input_ids'],
                attention_mask=encoded['attention_mask']
            )
            # Get the [CLS] token embedding (first token)
            embedding = outputs.last_hidden_state[:, 0, :].numpy()

        # Predict with available models
        predictions = {}
        if 'random_forest' in models:
            predictions['rf'] = models['random_forest'].predict(embedding)[0]
            rf_proba = models['random_forest'].predict_proba(embedding)[0]
            confidence = float(max(rf_proba))
        elif 'logistic_regression' in models:
            predictions['lr'] = models['logistic_regression'].predict(embedding)[0]
            lr_proba = models['logistic_regression'].predict_proba(embedding)[0]
            confidence = float(max(lr_proba))
        else:
            # Fallback: keyword-based prediction
            disease_keywords = ['covid', 'corona', 'virus', 'sick', 'fever', 'cough', 'symptom']
            predictions['keyword'] = 1 if any(k in cleaned_text for k in disease_keywords) else 0
            confidence = 0.7

        # Get final prediction (use RF if available, otherwise first available)
        prediction = predictions.get('rf', predictions.get('lr', predictions.get('keyword', 0)))

        # Extract symptoms
        symptoms = extract_symptoms(text)

        # Sentiment (simple keyword-based)
        positive_keywords = ['good', 'better', 'recover', 'hope', 'positive', 'safe']
        negative_keywords = ['bad', 'worse', 'sick', 'death', 'fear', 'negative', 'crisis']

        text_lower = cleaned_text.lower()
        pos_count = sum(1 for word in positive_keywords if word in text_lower)
        neg_count = sum(1 for word in negative_keywords if word in text_lower)

        if pos_count > neg_count:
            sentiment = 'Positive'
        elif neg_count > pos_count:
            sentiment = 'Negative'
        else:
            sentiment = 'Neutral'

        result = {
            'is_disease_related': bool(prediction),
            'confidence': float(confidence),
            'symptoms': symptoms,
            'sentiment': sentiment,
            'processed_text': cleaned_text
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/timeline', methods=['GET'])
def get_timeline():
    """Get timeline data for charts"""
    if daily_trends is None:
        return jsonify({'error': 'Timeline data not loaded'}), 500

    try:
        # Use pre-computed daily trends
        timeline_data = daily_trends.copy()
        timeline_data['date'] = timeline_data['date'].dt.strftime('%Y-%m-%d')

        return jsonify(timeline_data[['date', 'total_tweets', 'disease_tweets']].to_dict('records'))

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/locations', methods=['GET'])
def get_locations():
    """Get location data for map"""
    if location_stats is None:
        return jsonify({'error': 'Location data not loaded'}), 500

    try:
        # Use pre-computed location statistics
        locations = location_stats.copy()
        locations = locations.rename(columns={'cleaned_location': 'location'})

        # Convert to list of dicts
        location_list = locations.head(100).to_dict('records')

        return jsonify(location_list)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/hotspots', methods=['GET'])
def get_hotspots():
    """Get disease hotspots"""
    if location_stats is None:
        return jsonify({'error': 'Location data not loaded'}), 500

    try:
        # Use pre-computed location statistics, sort by disease count
        hotspots = location_stats.copy()
        hotspots = hotspots.sort_values('disease_count', ascending=False).head(20)

        # Format for frontend
        hotspots_list = []
        for _, row in hotspots.iterrows():
            hotspots_list.append({
                'location': row['cleaned_location'],
                'count': int(row['disease_count'])
            })

        return jsonify(hotspots_list)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/symptoms', methods=['GET'])
def get_symptoms():
    """Get symptom distribution"""
    if df is None:
        return jsonify({'error': 'Data not loaded'}), 500

    try:
        # Count symptom mentions
        symptom_counts = {category: 0 for category in SYMPTOM_CATEGORIES.keys()}

        # Count from extracted symptoms column
        if 'extracted_symptoms' in df.columns:
            for symptoms_str in df['extracted_symptoms'].dropna():
                try:
                    # Handle string representation of dict
                    if isinstance(symptoms_str, str) and symptoms_str.strip():
                        # Remove the curly braces and parse
                        import ast
                        symptoms = ast.literal_eval(symptoms_str)
                    else:
                        symptoms = symptoms_str

                    if isinstance(symptoms, dict):
                        for category in symptoms.keys():
                            if category in symptom_counts:
                                symptom_counts[category] += 1
                except Exception as e:
                    continue

        # Convert to list format
        symptoms_list = [{'category': k, 'count': v} for k, v in symptom_counts.items() if v > 0]
        symptoms_list.sort(key=lambda x: x['count'], reverse=True)

        return jsonify(symptoms_list)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sentiment', methods=['GET'])
def get_sentiment_analysis():
    """Get sentiment distribution"""
    if df is None:
        return jsonify({'error': 'Data not loaded'}), 500

    try:
        # Check if sentiment column exists
        if 'sentiment' in df.columns:
            sentiment_counts = df['sentiment'].value_counts().to_dict()
            result = {
                'positive': int(sentiment_counts.get('POSITIVE', 0)),
                'negative': int(sentiment_counts.get('NEGATIVE', 0))
            }
        else:
            # Simple keyword-based sentiment analysis
            positive_keywords = ['good', 'better', 'recover', 'hope', 'positive', 'safe', 'healthy']
            negative_keywords = ['bad', 'worse', 'sick', 'death', 'fear', 'negative', 'crisis', 'pain']

            positive_count = 0
            negative_count = 0

            for text in df['cleaned_text']:
                text_lower = str(text).lower()
                if any(word in text_lower for word in positive_keywords):
                    positive_count += 1
                elif any(word in text_lower for word in negative_keywords):
                    negative_count += 1

            result = {
                'positive': positive_count,
                'negative': negative_count
            }

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/clusters', methods=['GET'])
def get_clusters():
    """Get cluster information"""
    # Phase 4 not implemented yet
    return jsonify({
        'message': 'Clustering analysis not available (Phase 4 not implemented)',
        'clusters': []
    })

@app.route('/api/topics', methods=['GET'])
def get_topics():
    """Get topic modeling results"""
    # Phase 4 not implemented yet
    return jsonify({
        'message': 'Topic modeling not available (Phase 4 not implemented)',
        'topics': []
    })

@app.route('/api/tweets', methods=['GET'])
def get_tweets():
    """Get paginated tweets with filters"""
    if df is None:
        return jsonify({'error': 'Data not loaded'}), 500

    try:
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        disease_only = request.args.get('disease_only', 'false').lower() == 'true'

        # Filter
        filtered_df = df.copy()
        if disease_only:
            filtered_df = filtered_df[filtered_df['label'] == 1]

        # Pagination
        start = (page - 1) * limit
        end = start + limit

        tweets_page = filtered_df.iloc[start:end]

        # Convert to dict
        tweets = []
        for idx, row in tweets_page.iterrows():
            # Simple sentiment based on keywords
            text_lower = str(row.get('cleaned_text', '')).lower()
            if 'sentiment' in df.columns:
                sentiment = str(row['sentiment'])
            else:
                positive_keywords = ['good', 'better', 'recover', 'hope']
                negative_keywords = ['bad', 'worse', 'sick', 'death', 'fear']
                if any(word in text_lower for word in positive_keywords):
                    sentiment = 'POSITIVE'
                elif any(word in text_lower for word in negative_keywords):
                    sentiment = 'NEGATIVE'
                else:
                    sentiment = 'NEUTRAL'

            tweet = {
                'id': int(idx),
                'text': str(row.get('original_text', row.get('text', ''))),
                'date': str(row['date']),
                'location': str(row.get('user_location', 'Unknown')),
                'is_disease': bool(row['label']),
                'sentiment': sentiment
            }
            tweets.append(tweet)

        result = {
            'tweets': tweets,
            'total': int(len(filtered_df)),
            'page': page,
            'pages': int(np.ceil(len(filtered_df) / limit))
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/forecast', methods=['GET'])
def get_forecast():
    """Get forecasting predictions"""
    try:
        # Load forecast data if available
        if os.path.exists('data/processed/forecast_comparison.csv'):
            forecast_df = pd.read_csv('data/processed/forecast_comparison.csv')
            return jsonify(forecast_df.to_dict('records'))
        else:
            return jsonify({'message': 'Forecast data not available'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/hourly-pattern', methods=['GET'])
def get_hourly_pattern():
    """Get hourly tweet pattern"""
    if df is None:
        return jsonify({'error': 'Data not loaded'}), 500

    try:
        df['hour'] = pd.to_datetime(df['date']).dt.hour
        hourly = df.groupby('hour').agg({
            'label': ['count', 'sum']
        }).reset_index()

        hourly.columns = ['hour', 'total', 'disease']

        return jsonify(hourly.to_dict('records'))

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("\n" + "="*60)
    print("COVID-19 Tweets Analysis API Server")
    print("="*60)
    print("\nAPI Endpoints:")
    print("  GET  /api/health           - Health check")
    print("  GET  /api/stats            - Overall statistics")
    print("  POST /api/analyze          - Analyze tweet")
    print("  GET  /api/timeline         - Timeline data")
    print("  GET  /api/locations        - Location data")
    print("  GET  /api/hotspots         - Disease hotspots")
    print("  GET  /api/symptoms         - Symptom distribution")
    print("  GET  /api/sentiment        - Sentiment analysis")
    print("  GET  /api/clusters         - Cluster info")
    print("  GET  /api/topics           - Topic modeling")
    print("  GET  /api/tweets           - Paginated tweets")
    print("  GET  /api/forecast         - Forecast data")
    print("  GET  /api/hourly-pattern   - Hourly patterns")
    print("\nStarting server on http://localhost:5000")
    print("="*60 + "\n")

    app.run(debug=True, host='0.0.0.0', port=5000)
