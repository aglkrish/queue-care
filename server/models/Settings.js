const mongoose = require('mongoose');

/**
 * Settings Schema
 * Singleton-style document holding clinic-wide configuration.
 * Only one document should ever exist (enforced in the controller via findOneAndUpdate upsert).
 */
const settingsSchema = new mongoose.Schema(
  {
    averageConsultationTime: {
      type: Number,
      required: true,
      default: 10, // minutes
      min: [1, 'Average consultation time must be at least 1 minute'],
      max: [240, 'Average consultation time seems unrealistically high'],
    },
    // Running counter for token generation, persisted so tokens survive restarts.
    // Resets daily via lastResetDate check.
    tokenCounter: {
      type: Number,
      default: 0,
    },
    lastResetDate: {
      type: String, // YYYY-MM-DD
      default: () => new Date().toISOString().slice(0, 10),
    },
    // Letter prefix for tokens (A, B, C... in case of >999 patients in a day)
    tokenPrefix: {
      type: String,
      default: 'A',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
