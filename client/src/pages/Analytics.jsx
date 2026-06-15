import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { api } from '../services/api';
import { useQueue } from '../hooks/useQueue';
import { LoadingState } from '../components/Feedback';
import { useToast } from '../context/ToastContext';

function StatCard({ label, value, sublabel, accent }) {
  return (
    <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm dark:border-secondary-800 dark:bg-secondary-900">
      <p className="text-xs font-medium uppercase tracking-wide text-secondary-500 dark:text-secondary-400">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${accent || 'text-secondary-900 dark:text-white'}`}>{value}</p>
      {sublabel && <p className="mt-1 text-xs text-secondary-400">{sublabel}</p>}
    </div>
  );
}

const HOUR_LABEL = (h) => `${String(h).padStart(2, '0')}:00`;

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { state } = useQueue();

  const fetchAnalytics = async () => {
    try {
      const res = await api.getAnalytics();
      if (res.success) setData(res.data);
    } catch (err) {
      showToast(`Failed to load analytics: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh analytics whenever the live queue changes
  useEffect(() => {
    if (!loading) fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.servedToday, state.totalWaiting]);

  if (loading || !data) {
    return <LoadingState message="Loading analytics..." />;
  }

  const hourlyServedData = data.hourlyServed
    .filter((h) => h.hour >= 6 && h.hour <= 22) // show clinic hours only
    .map((h) => ({ hour: HOUR_LABEL(h.hour), Served: h.count }));

  const queueTrendData = data.queueLengthTrend
    .filter((h) => h.hour >= 6 && h.hour <= 22)
    .map((h) => ({ hour: HOUR_LABEL(h.hour), 'Patients Joined': h.count }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary-900 dark:text-white">Dashboard Analytics</h1>
        <p className="text-sm text-secondary-500 dark:text-secondary-400">
          Live insights into clinic queue performance for today.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Patients Served Today" value={data.patientsServedToday} accent="text-success-500" />
        <StatCard
          label="Average Wait Time"
          value={`${data.averageWaitTimeMinutes} min`}
          sublabel="Actual measured wait (join → consultation start)"
          accent="text-primary-600"
        />
        <StatCard
          label="Average Consultation Time"
          value={`${data.averageConsultationTime} min`}
          sublabel="Configured by receptionist"
        />
        <StatCard label="Currently Waiting" value={data.currentWaiting} accent="text-amber-500" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-secondary-200 bg-white p-5 shadow-sm dark:border-secondary-800 dark:bg-secondary-900">
          <h2 className="mb-4 text-base font-semibold text-secondary-900 dark:text-white">
            Patients Served by Hour
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hourlyServedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-secondary-200 dark:stroke-secondary-700" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="Served" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-secondary-200 bg-white p-5 shadow-sm dark:border-secondary-800 dark:bg-secondary-900">
          <h2 className="mb-4 text-base font-semibold text-secondary-900 dark:text-white">
            Queue Length Trend (New Patients by Hour)
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={queueTrendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-secondary-200 dark:stroke-secondary-700" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Patients Joined" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
