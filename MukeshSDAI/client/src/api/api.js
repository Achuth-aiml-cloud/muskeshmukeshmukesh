import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const apiService = {
  // Health check
  healthCheck: () => api.get('/health'),

  // Statistics
  getStats: () => api.get('/stats'),

  // Analysis
  analyzeTweet: (text) => api.post('/analyze', { text }),

  // Data endpoints
  getTimeline: () => api.get('/timeline'),
  getLocations: () => api.get('/locations'),
  getHotspots: () => api.get('/hotspots'),
  getSymptoms: () => api.get('/symptoms'),
  getSentiment: () => api.get('/sentiment'),
  getClusters: () => api.get('/clusters'),
  getTopics: () => api.get('/topics'),
  getTweets: (page = 1, limit = 20, diseaseOnly = false) =>
    api.get('/tweets', { params: { page, limit, disease_only: diseaseOnly } }),
  getForecast: () => api.get('/forecast'),
  getHourlyPattern: () => api.get('/hourly-pattern'),
};

export default api;
