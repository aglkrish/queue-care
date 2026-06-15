import { Routes, Route } from 'react-router-dom';
import { useTheme } from './context/ThemeContext';
import { socket } from './sockets/socket';
import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import ReceptionistDashboard from './pages/ReceptionistDashboard';
import PatientDisplay from './pages/PatientDisplay';
import Analytics from './pages/Analytics';

export default function App() {
  // Keep theme provider mounted at root (already wrapped in main.jsx),
  // here we just track connection status for the navbar.
  useTheme();
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-secondary-50 dark:bg-secondary-950">
      <Navbar connected={connected} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<ReceptionistDashboard />} />
          <Route path="/display" element={<PatientDisplay />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
      <footer className="border-t border-secondary-200 py-4 text-center text-xs text-secondary-400 dark:border-secondary-800">
        QueueCure &apos;26 — Built for Wooble&apos;s Queue Cure Hackathon
      </footer>
    </div>
  );
}
