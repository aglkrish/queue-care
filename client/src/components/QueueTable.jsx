import { useState } from 'react';
import { StatusBadge, EmptyState, Spinner } from './Feedback';

const PAGE_SIZE = 10;

/**
 * Formats a Date (or ISO string) as a readable local time, e.g. "10:42 AM".
 */
function formatTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Main queue table for the receptionist dashboard.
 * Shows Token, Patient Name, Age, Phone, Join Time, Status, and row actions.
 * Includes client-side search (by name or token) and pagination for
 * efficient handling of very large queues (Edge Case 5).
 */
export default function QueueTable({ patients, currentToken, onMarkComplete, onRemove }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(null); // patient id currently processing

  const filtered = patients.filter((p) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return p.name.toLowerCase().includes(q) || p.token.toLowerCase().includes(q) || p.phone.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleAction = async (id, fn) => {
    setActionLoading(id);
    try {
      await fn(id);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="rounded-xl border border-secondary-200 bg-white shadow-sm dark:border-secondary-800 dark:bg-secondary-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-secondary-200 p-4 dark:border-secondary-800">
        <h2 className="text-base font-semibold text-secondary-900 dark:text-white">
          Queue ({filtered.length})
        </h2>
        <div className="relative w-full sm:w-64">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or token..."
            aria-label="Search patients by name or token"
            className="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 pl-9 text-sm shadow-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:border-secondary-700 dark:bg-secondary-800 dark:text-white"
          />
          <svg
            className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-secondary-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🧾"
          title={search ? 'No matching patients' : 'Queue is empty'}
          description={
            search
              ? 'Try a different name, token, or phone number.'
              : 'Add a patient using the form above to get started.'
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-secondary-200 text-xs uppercase tracking-wide text-secondary-500 dark:border-secondary-800 dark:text-secondary-400">
                  <th className="px-4 py-3 font-medium">Token</th>
                  <th className="px-4 py-3 font-medium">Patient Name</th>
                  <th className="px-4 py-3 font-medium">Age</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Join Time</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
                {pageItems.map((p) => (
                  <tr
                    key={p._id}
                    className={`transition-colors hover:bg-secondary-50 dark:hover:bg-secondary-800/50 ${
                      p.token === currentToken ? 'bg-primary-50/60 dark:bg-primary-900/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-secondary-900 dark:text-white">
                      {p.token}
                    </td>
                    <td className="px-4 py-3 text-secondary-700 dark:text-secondary-200">{p.name}</td>
                    <td className="px-4 py-3 text-secondary-500 dark:text-secondary-400">{p.age}</td>
                    <td className="px-4 py-3 text-secondary-500 dark:text-secondary-400">{p.phone}</td>
                    <td className="px-4 py-3 text-secondary-500 dark:text-secondary-400">
                      {formatTime(p.joinTime)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {p.status === 'in-consultation' && (
                          <button
                            onClick={() => handleAction(p._id, onMarkComplete)}
                            disabled={actionLoading === p._id}
                            className="inline-flex items-center gap-1 rounded-md bg-success-500 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-success-600 disabled:opacity-60"
                          >
                            {actionLoading === p._id && <Spinner size="sm" className="border-white/40 border-t-white h-3 w-3" />}
                            Mark Complete
                          </button>
                        )}
                        {p.status !== 'completed' && p.status !== 'removed' && (
                          <button
                            onClick={() => handleAction(p._id, onRemove)}
                            disabled={actionLoading === p._id}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                          >
                            {actionLoading === p._id && <Spinner size="sm" className="border-red-300 border-t-red-600 h-3 w-3" />}
                            Remove
                          </button>
                        )}
                        {(p.status === 'completed' || p.status === 'removed') && (
                          <span className="text-xs text-secondary-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-secondary-200 px-4 py-3 dark:border-secondary-800">
              <p className="text-xs text-secondary-500 dark:text-secondary-400">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-md border border-secondary-300 px-3 py-1.5 text-xs font-medium text-secondary-600 transition-colors hover:bg-secondary-50 disabled:opacity-50 dark:border-secondary-700 dark:text-secondary-300 dark:hover:bg-secondary-800"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-md border border-secondary-300 px-3 py-1.5 text-xs font-medium text-secondary-600 transition-colors hover:bg-secondary-50 disabled:opacity-50 dark:border-secondary-700 dark:text-secondary-300 dark:hover:bg-secondary-800"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
