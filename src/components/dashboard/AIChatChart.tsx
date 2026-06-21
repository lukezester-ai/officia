'use client';

import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AIChatChart({ chartData }: { chartData: any }) {
  if (!chartData) return null;

  return (
    <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl w-full sm:w-[500px] h-[350px]">
      <h3 className="text-center font-semibold mb-4 text-violet-300">{chartData.title}</h3>
      <ResponsiveContainer width="100%" height="80%">
        {chartData.type === 'bar' ? (
          <BarChart data={chartData.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
            <XAxis dataKey={chartData.xAxisKey} stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff20' }} />
            <Legend />
            <Bar dataKey={chartData.yAxisKey} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : chartData.type === 'line' ? (
          <LineChart data={chartData.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
            <XAxis dataKey={chartData.xAxisKey} stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff20' }} />
            <Legend />
            <Line type="monotone" dataKey={chartData.yAxisKey} stroke="#8b5cf6" strokeWidth={3} />
          </LineChart>
        ) : (
          <PieChart>
            <Pie data={chartData.data} dataKey={chartData.yAxisKey} nameKey={chartData.xAxisKey} cx="50%" cy="50%" outerRadius={80} fill="#8b5cf6" label />
            <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff20' }} />
            <Legend />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
