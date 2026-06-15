import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

/**
 * Provides a global toast notification system.
 * Usage: const { showToast } = useToast(); showToast('Message', 'success' | 'error' | 'info' | 'warning')
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'info', duration = 4000) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
      return id;
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const TYPE_STYLES = {
  success: 'bg-success-500 text-white border-success-600',
  error: 'bg-red-500 text-white border-red-600',
  warning: 'bg-amber-500 text-white border-amber-600',
  info: 'bg-primary-600 text-white border-primary-700',
};

const TYPE_ICONS = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
};

function ToastContainer({ toasts, onClose }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] sm:w-auto sm:max-w-sm"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`animate-slide-up flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${
            TYPE_STYLES[toast.type] || TYPE_STYLES.info
          }`}
        >
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/25 text-xs font-bold">
            {TYPE_ICONS[toast.type] || TYPE_ICONS.info}
          </span>
          <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
          <button
            onClick={() => onClose(toast.id)}
            className="ml-1 flex-shrink-0 text-white/80 hover:text-white"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
