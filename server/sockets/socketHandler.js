const { QUEUE_STATE } = require('./events');
const { getQueueState } = require('../utils/queueHelpers');

/**
 * Initializes Socket.IO connection handling.
 *
 * Edge Case 4 (Socket Reconnection): On every new connection (including
 * reconnections after a network drop), we immediately push the full current
 * queue state to that socket so the client is guaranteed to be in sync,
 * regardless of how many events it may have missed while disconnected.
 *
 * @param {import('socket.io').Server} io
 */
function initSocket(io) {
  io.on('connection', async (socket) => {
    console.log(`Socket connected: ${socket.id} (${io.engine.clientsCount} total)`);

    try {
      const state = await getQueueState();
      socket.emit(QUEUE_STATE, state);
    } catch (err) {
      console.error('Failed to send initial queue state to socket', socket.id, err.message);
    }

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });

    // Allow clients to explicitly request a fresh full sync
    // (used by the frontend after reconnect events as a defense-in-depth measure)
    socket.on('requestSync', async () => {
      try {
        const state = await getQueueState();
        socket.emit(QUEUE_STATE, state);
      } catch (err) {
        console.error('Failed to resync socket', socket.id, err.message);
      }
    });
  });
}

module.exports = initSocket;
