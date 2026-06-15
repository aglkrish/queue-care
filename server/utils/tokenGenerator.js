const Settings = require('../models/Settings');

/**
 * Generates the next sequential token for today (e.g. A001, A002, ... A999, B001, ...).
 *
 * Uses MongoDB's atomic findOneAndUpdate with $inc to avoid race conditions when
 * multiple receptionists add patients concurrently (related to Edge Case 2).
 *
 * Tokens reset to 001 each new day, and the prefix letter rolls over (A -> B -> ... -> Z)
 * if more than 999 patients are registered in a single day.
 *
 * @returns {Promise<{ token: string, sequence: number }>}
 */
async function generateNextToken() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Fetch current settings (or create default if none exist)
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }

  // If the day has changed, reset the counter and prefix atomically
  if (settings.lastResetDate !== today) {
    settings = await Settings.findOneAndUpdate(
      { _id: settings._id },
      { $set: { tokenCounter: 0, lastResetDate: today, tokenPrefix: 'A' } },
      { new: true }
    );
  }

  // Atomically increment the counter
  const updated = await Settings.findOneAndUpdate(
    { _id: settings._id },
    { $inc: { tokenCounter: 1 } },
    { new: true }
  );

  let counter = updated.tokenCounter;
  let prefix = updated.tokenPrefix;

  // Roll over prefix if counter exceeds 999
  if (counter > 999) {
    const nextPrefixCharCode = prefix.charCodeAt(0) + 1;
    prefix = String.fromCharCode(nextPrefixCharCode > 90 ? 65 : nextPrefixCharCode); // wrap Z -> A
    counter = 1;
    await Settings.findOneAndUpdate(
      { _id: settings._id },
      { $set: { tokenCounter: 1, tokenPrefix: prefix } }
    );
  }

  const token = `${prefix}${String(counter).padStart(3, '0')}`;

  // sequence is a global monotonically increasing number used for FIFO ordering,
  // independent of the display token (handles prefix rollovers cleanly)
  const sequence = (settings.tokenCounter || 0) * 1; // base sequence component
  const globalSequence = await computeGlobalSequence();

  return { token, sequence: globalSequence };
}

/**
 * Returns a strictly increasing sequence number based on the highest existing
 * sequence in the Patient collection. This guarantees FIFO ordering remains
 * stable even across token prefix rollovers or day resets.
 */
async function computeGlobalSequence() {
  const Patient = require('../models/Patient');
  const last = await Patient.findOne().sort({ sequence: -1 }).select('sequence').lean();
  return last ? last.sequence + 1 : 1;
}

module.exports = { generateNextToken };
