/**
 * Simple in-memory mutex/lock to prevent race conditions when multiple
 * receptionists click "Call Next" simultaneously (Edge Case 2).
 *
 * For a single-instance Node.js server, an in-memory lock is sufficient because
 * all requests are handled on the same event loop / process. If this server is
 * ever scaled horizontally (multiple instances behind a load balancer), this
 * should be replaced with a distributed lock (e.g. Redis SETNX / Redlock) or
 * the "callNext" operation should be moved into a single atomic MongoDB
 * findOneAndUpdate (which is also implemented as a defense-in-depth measure
 * in patientController.js).
 */
class AsyncLock {
  constructor() {
    this.locked = false;
    this.queue = [];
  }

  /**
   * Acquires the lock. Resolves when the lock is available.
   */
  acquire() {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  /**
   * Releases the lock, allowing the next queued caller to proceed.
   */
  release() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next(); // lock stays "locked" for the next caller
    } else {
      this.locked = false;
    }
  }

  /**
   * Convenience wrapper: runs fn() while holding the lock, always releasing afterwards.
   */
  async runExclusive(fn) {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

// Single shared lock instance for the "call next" operation across the whole app
const callNextLock = new AsyncLock();

module.exports = { AsyncLock, callNextLock };
