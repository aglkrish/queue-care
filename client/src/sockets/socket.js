import { io } from 'socket.io-client';
import { API_URL } from '../services/api';

/**
 * Singleton Socket.IO client instance, shared across the whole app.
 *
 * Configured with automatic reconnection (Edge Case 4: Socket Reconnection):
 * - socket.io-client reconnects automatically by default.
 * - On every 'connect' event (including reconnects), the server immediately
 *   pushes a full `queueState` event (see server/sockets/socketHandler.js),
 *   so the client is always resynced after a dropped connection.
 */
export const socket = io(API_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  transports: ['websocket', 'polling'],
});

/**
 * Forces a manual resync by asking the server to re-emit the full queue state.
 * Useful as a defense-in-depth measure after reconnects.
 */
export function requestSync() {
  if (socket.connected) {
    socket.emit('requestSync');
  }
}
