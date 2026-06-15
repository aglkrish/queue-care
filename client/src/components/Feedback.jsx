/**
 * Generic spinner used for loading states throughout the app.
 */
export function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div
      className={`animate-spin rounded-full border-primary-200 border-t-primary-600 dark:border-secondary-700 dark:border-t-primary-400 ${sizes[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

/**
 * Full-page / full-section loading state.
 */
export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20">
      <Spinner size="lg" />
      <p className="text-sm text-secondary-500 dark:text-secondary-400">{message}</p>
    </div>
  );
}

/**
 * Empty state with icon, title, description, and optional action.
 */
export function EmptyState({ icon = '🗂️', title, description, action }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center animate-fade-in">
      <div className="text-5xl mb-1" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-secondary-700 dark:text-secondary-200">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-secondary-500 dark:text-secondary-400">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/**
 * Small colored badge for status display.
 */
export function StatusBadge({ status }) {
  const styles = {
    waiting: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    'in-consultation': 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
    completed: 'bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400',
    removed: 'bg-secondary-100 text-secondary-500 dark:bg-secondary-800 dark:text-secondary-400',
  };

  const labels = {
    waiting: 'Waiting',
    'in-consultation': 'In Consultation',
    completed: 'Completed',
    removed: 'Removed',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] || styles.waiting
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

/**
 * Connection status indicator dot + label.
 */
export function ConnectionStatus({ connected }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium">
      <span
        className={`h-2 w-2 rounded-full ${
          connected ? 'bg-success-500 animate-pulse' : 'bg-red-500'
        }`}
        aria-hidden="true"
      />
      <span className={connected ? 'text-success-600 dark:text-success-400' : 'text-red-500'}>
        {connected ? 'Live' : 'Reconnecting...'}
      </span>
    </div>
  );
}
