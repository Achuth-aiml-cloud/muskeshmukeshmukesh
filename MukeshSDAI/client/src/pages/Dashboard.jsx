import { useState, useEffect } from 'react';
import { apiService } from '../api/api';
import StatCard from '../components/common/StatCard';
import Loading from '../components/common/Loading';
import TimelineChart from '../components/charts/TimelineChart';
import { Activity, MapPin, Calendar, TrendingUp, Users, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, timelineRes] = await Promise.all([
          apiService.getStats(),
          apiService.getTimeline(),
        ]);
        setStats(statsRes.data);
        setTimeline(timelineRes.data);
        toast.success('Dashboard data loaded successfully');
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Loading message="Loading dashboard..." />;

  const diseaseRate = stats?.total_tweets > 0
    ? ((stats.disease_tweets / stats.total_tweets) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">
          Overview of COVID-19 tweet analysis and disease detection
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Tweets"
          value={stats?.total_tweets?.toLocaleString() || '0'}
          subtitle="Analyzed tweets"
          icon={Activity}
          color="primary"
        />
        <StatCard
          title="Disease Detected"
          value={stats?.disease_tweets?.toLocaleString() || '0'}
          subtitle={`${diseaseRate}% of total`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Locations"
          value={stats?.locations?.toLocaleString() || '0'}
          subtitle="Geographic coverage"
          icon={MapPin}
          color="blue"
        />
        <StatCard
          title="Date Range"
          value={stats?.date_range?.end ? new Date(stats.date_range.end).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '-'}
          subtitle={stats?.date_range ? `${stats.date_range.start} to ${stats.date_range.end}` : 'Loading...'}
          icon={Calendar}
          color="purple"
        />
      </div>

      {/* Timeline Chart */}
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Disease Trends Over Time</h3>
        <TimelineChart data={timeline} />
      </div>

      {/* Additional Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Heart className="w-5 h-5 mr-2 text-primary-600" />
            Sentiment Analysis
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Positive</span>
              <span className="font-semibold text-green-600 text-lg">
                {stats?.positive_sentiment?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${(stats?.positive_sentiment / (stats?.positive_sentiment + stats?.negative_sentiment) * 100) || 0}%`
                }}
              ></div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-gray-600">Negative</span>
              <span className="font-semibold text-red-600 text-lg">
                {stats?.negative_sentiment?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${(stats?.negative_sentiment / (stats?.positive_sentiment + stats?.negative_sentiment) * 100) || 0}%`
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-primary-600" />
            Clusters Identified
          </h3>
          <div className="text-5xl font-bold text-primary-600 mb-2">
            {stats?.clusters || '0'}
          </div>
          <p className="text-gray-600">
            Distinct tweet clusters discovered through K-Means clustering
          </p>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Detection Rate</span>
              <span className="font-bold text-primary-600">{diseaseRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Days</span>
              <span className="font-bold text-gray-900">
                {stats?.date_range ? Math.ceil((new Date(stats.date_range.end) - new Date(stats.date_range.start)) / (1000 * 60 * 60 * 24)) : '0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Avg Tweets/Day</span>
              <span className="font-bold text-gray-900">
                {stats?.total_tweets && stats?.date_range
                  ? Math.round(stats.total_tweets / Math.ceil((new Date(stats.date_range.end) - new Date(stats.date_range.start)) / (1000 * 60 * 60 * 24)))
                  : '0'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
