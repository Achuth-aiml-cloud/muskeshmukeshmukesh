import { useState } from 'react';
import { apiService } from '../api/api';
import Loading from '../components/common/Loading';
import { Search, AlertCircle, CheckCircle, Activity, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

function Analysis() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim()) {
      toast.error('Please enter some text to analyze');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.analyzeTweet(text);
      setResult(response.data);
      toast.success('Analysis complete!');
    } catch (error) {
      console.error('Error analyzing tweet:', error);
      toast.error('Failed to analyze tweet');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setText('');
    setResult(null);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Tweet Analysis</h2>
        <p className="text-gray-600 mt-1">
          Analyze tweets for COVID-19 disease detection using AI
        </p>
      </div>

      {/* Input Section */}
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Enter Tweet Text</h3>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter tweet text here... (e.g., 'I have a fever and cough, feeling really sick today')"
          className="input-field min-h-[150px] resize-y"
          rows="6"
        />
        <div className="flex space-x-4 mt-4">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="btn-primary flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>Analyze Tweet</span>
              </>
            )}
          </button>
          <button
            onClick={handleClear}
            className="btn-secondary"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Results Section */}
      {loading && <Loading message="Analyzing tweet with AI models..." />}

      {result && !loading && (
        <div className="space-y-6 animate-fade-in">
          {/* Disease Detection Result */}
          <div className={`card border-2 ${result.is_disease_related ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {result.is_disease_related ? (
                  <AlertCircle className="w-12 h-12 text-red-600" />
                ) : (
                  <CheckCircle className="w-12 h-12 text-green-600" />
                )}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {result.is_disease_related ? 'Disease Related' : 'Not Disease Related'}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    AI Model Prediction
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">
                  {(result.confidence * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Confidence</div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Symptoms */}
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-primary-600" />
                Detected Symptoms
              </h3>
              {Object.keys(result.symptoms).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(result.symptoms).map(([category, symptoms]) => (
                    <div key={category} className="border-l-4 border-primary-500 pl-3">
                      <div className="font-semibold text-gray-900">{category}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {symptoms.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No specific symptoms detected
                </div>
              )}
            </div>

            {/* Sentiment */}
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Heart className="w-5 h-5 mr-2 text-primary-600" />
                Sentiment Analysis
              </h3>
              <div className="text-center py-4">
                <div className={`text-5xl font-bold ${result.sentiment === 'Positive' ? 'text-green-600' : 'text-red-600'}`}>
                  {result.sentiment}
                </div>
                <p className="text-gray-600 mt-2">
                  Overall sentiment of the tweet
                </p>
              </div>
            </div>
          </div>

          {/* Processed Text */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Processed Text</h3>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-gray-700 italic">
                {result.processed_text || 'N/A'}
              </p>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              This is the cleaned and processed version of your input text used by the AI model.
            </p>
          </div>

          {/* Model Info */}
          <div className="card bg-blue-50 border border-blue-200">
            <div className="flex items-start space-x-3">
              <Activity className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h4 className="font-bold text-gray-900">Model Information</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Analysis performed using fine-tuned BERT model (bert-base-uncased) trained on COVID-19 tweets.
                  The model was trained on thousands of labeled tweets to detect disease-related content with high accuracy.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analysis;
