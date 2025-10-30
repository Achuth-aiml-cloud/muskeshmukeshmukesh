import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function TimelineChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-500 py-8">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="total_tweets"
          stroke="#3b82f6"
          name="Total Tweets"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="disease_tweets"
          stroke="#ef4444"
          name="Disease Tweets"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default TimelineChart;
