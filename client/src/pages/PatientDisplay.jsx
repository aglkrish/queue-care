import { useQueue } from '../hooks/useQueue';
import { LoadingState, EmptyState } from '../components/Feedback';

/**
 * Stat card for the waiting room display -- larger, simpler than the
 * receptionist version, designed for at-a-glance reading from a distance.
 */
function DisplayStat({ label, value, sublabel }) {
  return (
    <div className="rounded-2xl border border-secondary-200 bg-white p-5 text-center shadow-sm dark:border-secondary-800 dark:bg-secondary-900">
      <p className="text-sm font-medium uppercase tracking-wide text-secondary-500 dark:text-secondary-400">
        {label}
      </p>
      <p className="mt-2 text-4xl font-extrabold text-secondary-900 dark:text-white">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-secondary-400">{sublabel}</p>}
    </div>
  );
}

/**
 * Formats minutes as a human-readable wait time, e.g. "0 min", "50 min", "1 hr 20 min".
 */
function formatWait(minutes) {
  if (minutes <= 0) return 'Next up';
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
}

export default function PatientDisplay() {
  const { state, loading } = useQueue();

  if (loading) {
    return <LoadingState message="Loading display..." />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Current Token - large animated hero card */}
      <div
        key={state.currentToken || 'none'}
        className="animate-token-pop mb-8 rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 p-8 text-center text-white shadow-lg sm:p-12"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-100">
          Now Serving
        </p>
        <p className="mt-3 font-mono text-6xl font-extrabold tracking-wider sm:text-8xl">
          {state.currentToken || '—'}
        </p>
        {!state.currentToken && (
          <p className="mt-3 text-sm text-primary-100">No consultation in progress right now</p>
        )}
      </div>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DisplayStat label="Total Patients Waiting" value={state.totalWaiting} />
        <DisplayStat
          label="Average Consultation Time"
          value={`${state.averageConsultationTime} min`}
        />
        <DisplayStat label="Patients Served Today" value={state.servedToday} />
      </div>

      {/* Queue information */}
      <div className="rounded-2xl border border-secondary-200 bg-white shadow-sm dark:border-secondary-800 dark:bg-secondary-900">
        <div className="border-b border-secondary-200 p-5 dark:border-secondary-800">
          <h2 className="text-lg font-bold text-secondary-900 dark:text-white">Queue Status</h2>
          <p className="text-sm text-secondary-500 dark:text-secondary-400">
            Estimated wait time is calculated as patients ahead × average consultation time.
          </p>
        </div>

        {state.waitingList.length === 0 ? (
          <EmptyState icon="🎉" title="No patients waiting" description="The queue is currently empty." />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {state.waitingList.map((p) => (
              <div
                key={p._id}
                className="animate-fade-in flex flex-col items-center justify-center rounded-xl border border-secondary-200 bg-secondary-50 p-5 text-center dark:border-secondary-700 dark:bg-secondary-800"
              >
                <p className="font-mono text-3xl font-bold text-secondary-900 dark:text-white">{p.token}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-secondary-500 dark:text-secondary-400">
                  Position {p.position}
                </p>
                <p className="mt-3 text-lg font-semibold text-primary-600 dark:text-primary-400">
                  {formatWait(p.estimatedWaitMinutes)}
                </p>
                <p className="text-xs text-secondary-400">estimated wait</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
