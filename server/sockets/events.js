/**
 * Centralized Socket.IO event name constants.
 * Keeping these in one place avoids typos between emitter and listener code,
 * and serves as the single source of truth referenced by Socket_Event_Diagram.md.
 */
module.exports = {
  // Client -> Server (none required; all mutations go through REST API,
  // which then broadcasts via these Server -> Client events)

  // Server -> Client
  PATIENT_ADDED: 'patientAdded',
  CALL_NEXT: 'callNext',
  PATIENT_COMPLETED: 'patientCompleted',
  PATIENT_REMOVED: 'patientRemoved',
  AVERAGE_TIME_UPDATED: 'averageTimeUpdated',
  QUEUE_STATE: 'queueState', // full state sync, sent on connect & after every mutation

  // Connection lifecycle (built-in, listed here for documentation)
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
};
