import { useEffect, useState } from 'react';
import { useQueue } from '../hooks/useQueue';
import { api } from '../services/api';
import AddPatientForm from '../components/AddPatientForm';
import SettingsPanel from '../components/SettingsPanel';
import QueueTable from '../components/QueueTable';
import { LoadingState, Spinner } from '../components/Feedback';
import { useToast } from '../context/ToastContext';

/**
 * Stat card used at the top of the receptionist dashboard.
 */
function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm dark:border-secondary-800 dark:bg-secondary-900">
      <p className="text-xs font-medium uppercase tracking-wide text-secondary-500 dark:text-secondary-400">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${accent || 'text-secondary-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}

export default function ReceptionistDashboard() {
  const { state, loading, addPatient, callNext, markComplete, removePatient, updateAverageTime } = useQueue();
  const { showToast } = useToast();
  const [callingNext, setCallingNext] = useState(false);
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);

  const fetchPatients = async () => {
    try {
      const res = await api.getPatients({ limit: 1000 });
      if (res.success) setPatients(res.data);
    } catch (err) {
      showToast(`Failed to load patient list: ${err.message}`, 'error');
    } finally {
      setPatientsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sync the table whenever the live queue state changes (new patient,
  // call next, complete, remove, average time update -- all of these
  // change totalWaiting, currentToken, or servedToday).
  useEffect(() => {
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalWaiting, state.currentToken, state.servedToday]);

  const handleCallNext = async () => {
    setCallingNext(true);
    try {
      await callNext();
    } finally {
      setCallingNext(false);
    }
  };

  const handleExport = () => {
    window.open(api.exportCSVUrl(), '_blank');
  };

  if (loading) {
    return <LoadingState message="Loading queue..." />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-secondary-900 dark:text-white">Receptionist Dashboard</h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400">
            Manage the patient queue and call the next consultation.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-secondary-300 bg-white px-4 py-2.5 text-sm font-semibold text-secondary-700 shadow-sm transition-colors hover:bg-secondary-50 dark:border-secondary-700 dark:bg-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={handleCallNext}
            disabled={callingNext}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {callingNext && <Spinner size="sm" className="border-white/40 border-t-white" />}
            Call Next
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Current Token" value={state.currentToken || '—'} accent="text-primary-600" />
        <StatCard label="Patients Waiting" value={state.totalWaiting} accent="text-amber-500" />
        <StatCard label="Served Today" value={state.servedToday} accent="text-success-500" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AddPatientForm onAdd={addPatient} />
        </div>
        <SettingsPanel averageConsultationTime={state.averageConsultationTime} onUpdate={updateAverageTime} />
      </div>

      {patientsLoading ? (
        <LoadingState message="Loading patient list..." />
      ) : (
        <QueueTable
          patients={patients}
          currentToken={state.currentToken}
          onMarkComplete={markComplete}
          onRemove={removePatient}
        />
      )}
    </div>
  );
}
