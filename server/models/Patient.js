const mongoose = require('mongoose');

/**
 * Patient Schema
 * Represents a single token entry in the clinic queue.
 *
 * status lifecycle:
 *   waiting  -> in-consultation -> completed
 *   waiting  -> removed (manual removal by receptionist)
 */
const patientSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
      maxlength: 100,
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [0, 'Age cannot be negative'],
      max: [150, 'Age value is invalid'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[0-9+\-\s]{7,15}$/, 'Phone number is invalid'],
    },
    joinTime: {
      type: Date,
      default: Date.now,
    },
    consultationStartTime: {
      type: Date,
      default: null,
    },
    consultationEndTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['waiting', 'in-consultation', 'completed', 'removed'],
      default: 'waiting',
      index: true,
    },
    // sequence number used to generate token + maintain stable FIFO order
    sequence: {
      type: Number,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to efficiently fetch the waiting queue in FIFO order
patientSchema.index({ status: 1, sequence: 1 });

module.exports = mongoose.model('Patient', patientSchema);
