import { useState, useEffect } from 'react';
import { apiService } from '../api/api';
import Loading from '../components/common/Loading';
import { ChevronLeft, ChevronRight, Filter, Download } from 'lucide-react';
import toast from 'react-hot-toast';

function Results() {
  const [tweets, setTweets] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [diseaseOnly, setDiseaseOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTweets();
  }, [page, diseaseOnly]);

  const fetchTweets = async () => {
    setLoading(true);
    try {
      const response = await apiService.getTweets(page, 20, diseaseOnly);
      setTweets(response.data.tweets);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error('Error fetching tweets:', error);
      toast.error('Failed to load tweets');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  const handleExport = () => {
    toast.success('Export functionality coming soon!');
  };

  if (loading && tweets.length === 0) return <Loading message="Loading tweets..." />;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Tweet Results</h2>
          <p className="text-gray-600 mt-1">
            Browse and analyze tweet data with filtering options
          </p>
        </div>
        <button
          onClick={handleExport}
          className="btn-primary flex items-center space-x-2"
        >
          <Download className="w-5 h-5" />
          <span>Export Data</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={diseaseOnly}
                onChange={(e) => {
                  setDiseaseOnly(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-gray-700 font-medium">Show Disease-Related Only</span>
            </label>
          </div>
          <div className="text-sm text-gray-600">
            Showing page {page} of {totalPages}
          </div>
        </div>
      </div>

      {/* Tweets Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tweet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sentiment
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center">
                    <Loading message="Loading tweets..." />
                  </td>
                </tr>
              ) : tweets.length > 0 ? (
                tweets.map((tweet) => (
                  <tr key={tweet.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(tweet.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-md">
                      <div className="line-clamp-2">{tweet.text}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tweet.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          tweet.is_disease
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {tweet.is_disease ? 'Disease' : 'Normal'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          tweet.sentiment === 'POSITIVE'
                            ? 'bg-blue-100 text-blue-800'
                            : tweet.sentiment === 'NEGATIVE'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {tweet.sentiment}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No tweets found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevPage}
          disabled={page === 1 || loading}
          className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Previous</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-gray-600">
            Page {page} of {totalPages}
          </span>
        </div>

        <button
          onClick={handleNextPage}
          disabled={page === totalPages || loading}
          className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Next</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default Results;
