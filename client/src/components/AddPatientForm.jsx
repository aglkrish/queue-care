import { useState } from 'react';
import { Spinner } from './Feedback';

const INITIAL_FORM = { name: '', age: '', phone: '' };

/**
 * Form for the receptionist to add a new patient to the queue.
 * Validates inputs client-side before submission; server performs
 * authoritative validation as well.
 */
export default function AddPatientForm({ onAdd }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required';
    else if (form.name.trim().length > 100) next.name = 'Name is too long';

    const ageNum = Number(form.age);
    if (form.age === '' || isNaN(ageNum)) next.age = 'Age is required';
    else if (ageNum < 0 || ageNum > 150) next.age = 'Enter a valid age (0-150)';

    if (!form.phone.trim()) next.phone = 'Phone number is required';
    else if (!/^[0-9+\-\s]{7,15}$/.test(form.phone.trim())) next.phone = 'Enter a valid phone number';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onAdd({
        name: form.name.trim(),
        age: Number(form.age),
        phone: form.phone.trim(),
      });
      setForm(INITIAL_FORM);
      setErrors({});
    } catch {
      // Error toast handled by useQueue
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-secondary-200 bg-white p-5 shadow-sm dark:border-secondary-800 dark:bg-secondary-900"
    >
      <h2 className="mb-4 text-base font-semibold text-secondary-900 dark:text-white">Add Patient</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="patient-name" className="mb-1 block text-sm font-medium text-secondary-700 dark:text-secondary-300">
            Patient Name
          </label>
          <input
            id="patient-name"
            type="text"
            value={form.name}
            onChange={handleChange('name')}
            placeholder="e.g. Riya Sharma"
            className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:bg-secondary-800 dark:text-white ${
              errors.name
                ? 'border-red-400 focus:border-red-500'
                : 'border-secondary-300 focus:border-primary-500 dark:border-secondary-700'
            }`}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <p id="name-error" className="mt-1 text-xs text-red-500">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="patient-age" className="mb-1 block text-sm font-medium text-secondary-700 dark:text-secondary-300">
            Age
          </label>
          <input
            id="patient-age"
            type="number"
            min="0"
            max="150"
            value={form.age}
            onChange={handleChange('age')}
            placeholder="e.g. 34"
            className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:bg-secondary-800 dark:text-white ${
              errors.age
                ? 'border-red-400 focus:border-red-500'
                : 'border-secondary-300 focus:border-primary-500 dark:border-secondary-700'
            }`}
            aria-invalid={!!errors.age}
            aria-describedby={errors.age ? 'age-error' : undefined}
          />
          {errors.age && (
            <p id="age-error" className="mt-1 text-xs text-red-500">
              {errors.age}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="patient-phone" className="mb-1 block text-sm font-medium text-secondary-700 dark:text-secondary-300">
            Phone Number
          </label>
          <input
            id="patient-phone"
            type="tel"
            value={form.phone}
            onChange={handleChange('phone')}
            placeholder="e.g. 9876543210"
            className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:bg-secondary-800 dark:text-white ${
              errors.phone
                ? 'border-red-400 focus:border-red-500'
                : 'border-secondary-300 focus:border-primary-500 dark:border-secondary-700'
            }`}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
          />
          {errors.phone && (
            <p id="phone-error" className="mt-1 text-xs text-red-500">
              {errors.phone}
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? <Spinner size="sm" className="border-white/40 border-t-white" /> : null}
        Add Patient
      </button>
    </form>
  );
}
