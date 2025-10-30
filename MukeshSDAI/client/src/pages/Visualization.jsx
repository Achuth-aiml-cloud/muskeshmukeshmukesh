import { useState, useEffect } from 'react';
import { apiService } from '../api/api';
import Loading from '../components/common/Loading';
import BarChartComponent from '../components/charts/BarChartComponent';
import PieChartComponent from '../components/charts/PieChartComponent';
import TimelineChart from '../components/charts/TimelineChart';
import { BarChart3, PieChart, TrendingUp, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

function Visualization() {
  const [timeline, setTimeline] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [symptoms, setSymptoms] = useState([]);
  const [hourlyPattern, setHourlyPattern] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [timelineRes, hotspotsRes, symptomsRes, hourlyRes] = await Promise.all([
          apiService.getTimeline(),
          apiService.getHotspots(),
          apiService.getSymptoms(),
          apiService.getHourlyPattern(),
        ]);

        setTimeline(timelineRes.data);
        setHotspots(hotspotsRes.data);
        setSymptoms(symptomsRes.data);
        setHourlyPattern(hourlyRes.data);
        toast.success('Visualizations loaded successfully');
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load visualization data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Loading message="Loading visualizations..." />;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Visualizations</h2>
        <p className="text-gray-600 mt-1">
          Interactive charts and graphs for data analysis
        </p>
      </div>

      {/* Timeline Chart */}
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-primary-600" />
          Disease Trends Timeline
        </h3>
        <TimelineChart data={timeline} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hotspots Bar Chart */}
        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-6 h-6 mr-2 text-primary-600" />
            Top Disease Hotspots
          </h3>
          <BarChartComponent data={hotspots.slice(0, 10)} dataKey="location" />
        </div>

        {/* Symptoms Pie Chart */}
        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <PieChart className="w-6 h-6 mr-2 text-primary-600" />
            Symptom Distribution
          </h3>
          <PieChartComponent data={symptoms.filter(s => s.count > 0)} />
        </div>
      </div>

      {/* Hourly Pattern */}
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Clock className="w-6 h-6 mr-2 text-primary-600" />
          Hourly Tweet Pattern
        </h3>
        <BarChartComponent
          data={hourlyPattern}
          dataKey="hour"
        />
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="text-4xl font-bold text-primary-600 mb-2">
            {hotspots.length}
          </div>
          <div className="text-gray-600">Total Hotspots Identified</div>
        </div>
        <div className="card text-center">
          <div className="text-4xl font-bold text-green-600 mb-2">
            {symptoms.filter(s => s.count > 0).length}
          </div>
          <div className="text-gray-600">Symptom Categories Detected</div>
        </div>
        <div className="card text-center">
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {timeline.length}
          </div>
          <div className="text-gray-600">Days of Data</div>
        </div>
      </div>
    </div>
  );
}

export default Visualization;
