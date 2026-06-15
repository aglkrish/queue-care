import { useCallback, useEffect, useRef, useState } from 'react';
import { socket, requestSync } from '../sockets/socket';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

const EVENTS = {
  PATIENT_ADDED: 'patientAdded',
  CALL_NEXT: 'callNext',
  PATIENT_COMPLETED: 'patientCompleted',
  PATIENT_REMOVED: 'patientRemoved',
  AVERAGE_TIME_UPDATED: 'averageTimeUpdated',
  QUEUE_STATE: 'queueState',
};

const INITIAL_STATE = {
  currentToken: null,
  currentPatient: null,
  waitingList: [],
  averageConsultationTime: 10,
  totalWaiting: 0,
  servedToday: 0,
};

/**
 * Central hook that keeps queue state in sync via Socket.IO, with a REST
 * fallback for initial load and reconnection scenarios.
 *
 * Edge Case 3 (Browser Refresh): on mount, fetches the full queue state via
 * REST so the UI is populated immediately even before the socket connects.
 *
 * Edge Case 4 (Socket Reconnection): listens for 'connect' to detect
 * reconnects and requests a fresh sync; also listens for the server-pushed
 * 'queueState' event which is sent automatically on every connection.
 */
export function useQueue() {
  const [state, setState] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(socket.connected);
  const { showToast } = useToast();
  const hasConnectedBefore = useRef(false);

  // Initial REST fetch (handles refresh / first load)
  const fetchInitialState = useCallback(async () => {
    try {
      const res = await api.getQueueState();
      if (res.success) {
        setState(res.data);
      }
    } catch (err) {
      showToast(`Failed to load queue: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchInitialState();
  }, [fetchInitialState]);

  // Socket event listeners
  useEffect(() => {
    function onConnect() {
      setConnected(true);
      if (hasConnectedBefore.current) {
        // Reconnection: request a fresh sync as defense-in-depth
        requestSync();
        showToast('Reconnected to server. Queue synced.', 'success', 2500);
      }
      hasConnectedBefore.current = true;
    }

    function onDisconnect() {
      setConnected(false);
      showToast('Connection lost. Trying to reconnect...', 'warning', 3000);
    }

    function onQueueState(data) {
      setState(data);
      setLoading(false);
    }

    function onPatientAdded(payload) {
      showToast(`New patient added: ${payload.token} - ${payload.name}`, 'info', 3000);
    }

    function onCallNext(payload) {
      showToast(`Now serving token ${payload.currentToken}`, 'success', 3000);
    }

    function onPatientCompleted(payload) {
      showToast(`Consultation completed: ${payload.token}`, 'success', 2500);
    }

    function onPatientRemoved(payload) {
      showToast(`Patient removed: ${payload.token} - ${payload.name}`, 'warning', 2500);
    }

    function onAverageTimeUpdated(payload) {
      showToast(`Average consultation time updated to ${payload.averageConsultationTime} min`, 'info', 2500);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(EVENTS.QUEUE_STATE, onQueueState);
    socket.on(EVENTS.PATIENT_ADDED, onPatientAdded);
    socket.on(EVENTS.CALL_NEXT, onCallNext);
    socket.on(EVENTS.PATIENT_COMPLETED, onPatientCompleted);
    socket.on(EVENTS.PATIENT_REMOVED, onPatientRemoved);
    socket.on(EVENTS.AVERAGE_TIME_UPDATED, onAverageTimeUpdated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(EVENTS.QUEUE_STATE, onQueueState);
      socket.off(EVENTS.PATIENT_ADDED, onPatientAdded);
      socket.off(EVENTS.CALL_NEXT, onCallNext);
      socket.off(EVENTS.PATIENT_COMPLETED, onPatientCompleted);
      socket.off(EVENTS.PATIENT_REMOVED, onPatientRemoved);
      socket.off(EVENTS.AVERAGE_TIME_UPDATED, onAverageTimeUpdated);
    };
  }, [showToast]);

  // ---- Actions ----

  const addPatient = useCallback(
    async (payload) => {
      try {
        const res = await api.addPatient(payload);
        if (res.success) {
          showToast(`Patient added successfully. Token: ${res.data.token}`, 'success');
          if (res.queueState) setState(res.queueState);
        }
        return res;
      } catch (err) {
        showToast(err.message || 'Failed to add patient', 'error');
        throw err;
      }
    },
    [showToast]
  );

  const callNext = useCallback(async () => {
    try {
      const res = await api.callNext();
      if (res.queueState) setState(res.queueState);

      if (res.empty) {
        showToast('No patients in queue', 'warning');
      }
      return res;
    } catch (err) {
      showToast(err.message || 'Failed to call next patient', 'error');
      throw err;
    }
  }, [showToast]);

  const markComplete = useCallback(
    async (id) => {
      try {
        const res = await api.markComplete(id);
        if (res.queueState) setState(res.queueState);
        showToast('Marked as completed', 'success', 2000);
        return res;
      } catch (err) {
        showToast(err.message || 'Failed to mark complete', 'error');
        throw err;
      }
    },
    [showToast]
  );

  const removePatient = useCallback(
    async (id) => {
      try {
        const res = await api.removePatient(id);
        if (res.queueState) setState(res.queueState);
        return res;
      } catch (err) {
        showToast(err.message || 'Failed to remove patient', 'error');
        throw err;
      }
    },
    [showToast]
  );

  const updateAverageTime = useCallback(
    async (minutes) => {
      try {
        const res = await api.updateAverageTime(minutes);
        if (res.queueState) setState(res.queueState);
        showToast(`Average consultation time set to ${minutes} min`, 'success', 2000);
        return res;
      } catch (err) {
        showToast(err.message || 'Failed to update average time', 'error');
        throw err;
      }
    },
    [showToast]
  );

  return {
    state,
    loading,
    connected,
    addPatient,
    callNext,
    markComplete,
    removePatient,
    updateAverageTime,
    refetch: fetchInitialState,
  };
}
