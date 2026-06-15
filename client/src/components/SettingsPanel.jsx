import { useEffect, useState } from 'react';
import { Spinner } from './Feedback';

/**
 * Settings panel allowing the receptionist to view and edit the
 * average consultation time, which drives the wait-time calculation
 * shown on the patient waiting room display.
 */
export default function SettingsPanel({ averageConsultationTime, onUpdate }) {
  const [value, setValue] = useState(averageConsultationTime);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Keep local value in sync with incoming prop unless actively editing
  useEffect(() => {
    if (!editing) setValue(averageConsultationTime);
  }, [averageConsultationTime, editing]);

  const handleSave = async () => {
    const num = Number(value);
    if (isNaN(num) || num < 1 || num > 240) {
      setError('Enter a value between 1 and 240 minutes');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onUpdate(num);
      setEditing(false);
    } catch {
      // toast handled upstream
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(averageConsultationTime);
    setError('');
    setEditing(false);
  };

  return (
    <div className="rounded-xl border border-secondary-200 bg-white p-5 shadow-sm dark:border-secondary-800 dark:bg-secondary-900">
      <h2 className="mb-1 text-base font-semibold text-secondary-900 dark:text-white">Consultation Settings</h2>
      <p className="mb-4 text-sm text-secondary-500 dark:text-secondary-400">
        This value is used to calculate estimated wait times shown to patients.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="avg-time" className="mb-1 block text-sm font-medium text-secondary-700 dark:text-secondary-300">
            Average Consultation Time (minutes)
          </label>
          <input
            id="avg-time"
            type="number"
            min="1"
            max="240"
            value={value}
            disabled={!editing}
            onChange={(e) => setValue(e.target.value)}
            className={`w-32 rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:bg-secondary-800 dark:text-white ${
              error
                ? 'border-red-400 focus:border-red-500'
                : 'border-secondary-300 focus:border-primary-500 dark:border-secondary-700'
            } ${!editing ? 'cursor-not-allowed bg-secondary-50 dark:bg-secondary-800/50' : ''}`}
            aria-invalid={!!error}
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>

        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg border border-secondary-300 bg-white px-4 py-2 text-sm font-semibold text-secondary-700 shadow-sm transition-colors hover:bg-secondary-50 dark:border-secondary-700 dark:bg-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-700"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {saving && <Spinner size="sm" className="border-white/40 border-t-white" />}
              Save
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="rounded-lg border border-secondary-300 bg-white px-4 py-2 text-sm font-semibold text-secondary-700 shadow-sm transition-colors hover:bg-secondary-50 disabled:opacity-60 dark:border-secondary-700 dark:bg-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-700"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
