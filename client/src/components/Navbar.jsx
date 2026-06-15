import { NavLink } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ConnectionStatus } from './Feedback';

/**
 * Top navigation bar shown across all pages.
 * Contains branding, page links, connection status, and dark mode toggle.
 */
export default function Navbar({ connected }) {
  const { theme, toggleTheme } = useTheme();

  const linkClass = ({ isActive }) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary-600 text-white'
        : 'text-secondary-600 hover:bg-primary-50 hover:text-primary-700 dark:text-secondary-300 dark:hover:bg-secondary-800 dark:hover:text-primary-300'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-secondary-200 bg-white/90 backdrop-blur dark:border-secondary-800 dark:bg-secondary-900/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white font-bold text-sm shadow-sm">
            QC
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-secondary-900 dark:text-white">
              QueueCure <span className="text-primary-600">&apos;26</span>
            </h1>
            <p className="hidden text-xs text-secondary-500 dark:text-secondary-400 sm:block">
              Smart Clinic Queue Management
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main navigation">
          <NavLink to="/" className={linkClass} end>
            Receptionist
          </NavLink>
          <NavLink to="/display" className={linkClass}>
            Waiting Room
          </NavLink>
          <NavLink to="/analytics" className={linkClass}>
            Analytics
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <ConnectionStatus connected={connected} />
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-full p-2 text-secondary-500 hover:bg-secondary-100 hover:text-secondary-700 dark:text-secondary-400 dark:hover:bg-secondary-800 dark:hover:text-white transition-colors"
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
