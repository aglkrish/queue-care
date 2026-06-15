const Patient = require('../models/Patient');
const Settings = require('../models/Settings');
const { generateNextToken } = require('../utils/tokenGenerator');
const { getQueueState } = require('../utils/queueHelpers');
const { callNextLock } = require('../utils/lock');
const {
  PATIENT_ADDED,
  CALL_NEXT,
  PATIENT_COMPLETED,
  PATIENT_REMOVED,
  QUEUE_STATE,
} = require('../sockets/events');

/**
 * Broadcasts the full, recomputed queue state to all connected clients.
 * This is sent in ADDITION to the specific named events (patientAdded, callNext, etc.)
 * so that clients can either react to the specific event or simply re-render
 * from the latest full state -- whichever is simpler for their UI.
 */
async function broadcastQueueState(io) {
  const state = await getQueueState();
  io.emit(QUEUE_STATE, state);
  return state;
}

/**
 * GET /api/patients
 * Returns the full queue (all statuses), plus computed wait times for waiting patients.
 * Supports optional ?status= filter and ?search= (name or token).
 */
exports.getAllPatients = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 100 } = req.query;

    const filter = {};
    if (status) {
      filter.status = status;
    } else {
      // By default exclude "removed" patients from the main list view
      filter.status = { $ne: 'removed' };
    }

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: regex }, { token: regex }, { phone: regex }];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000); // cap at 1000 for large queues

    const [patients, total] = await Promise.all([
      Patient.find(filter)
        .sort({ sequence: 1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Patient.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: patients,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/queue/state
 * Returns the full computed queue state (used for initial load / refresh fallback).
 */
exports.getQueueStateHandler = async (req, res, next) => {
  try {
    const state = await getQueueState();
    res.json({ success: true, data: state });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/patients
 * Adds a new patient to the queue, generates a token, persists to DB,
 * and broadcasts `patientAdded` + full queue state via Socket.IO.
 */
exports.addPatient = async (req, res, next) => {
  try {
    const { name, age, phone } = req.body;

    // Basic validation (Mongoose schema validation also applies)
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Patient name is required.' });
    }
    if (age === undefined || age === null || isNaN(Number(age))) {
      return res.status(400).json({ success: false, message: 'A valid age is required.' });
    }
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    const { token, sequence } = await generateNextToken();

    const patient = await Patient.create({
      token,
      name: String(name).trim(),
      age: Number(age),
      phone: String(phone).trim(),
      sequence,
      status: 'waiting',
      joinTime: new Date(),
    });

    const io = req.app.get('io');

    io.emit(PATIENT_ADDED, {
      token: patient.token,
      name: patient.name,
    });

    const state = await broadcastQueueState(io);

    res.status(201).json({ success: true, data: patient, queueState: state });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/patients/call-next
 * Core "Call Next" logic:
 *   1. Mark current in-consultation patient (if any) as completed
 *   2. Pick the first waiting patient (FIFO by sequence)
 *   3. Mark them as in-consultation
 *   4. Broadcast callNext + patientCompleted + full state
 *
 * Edge Case 1 (Queue Empty): if there are no waiting patients, returns a
 * 200 response with a flag so the frontend can show "No patients in queue".
 *
 * Edge Case 2 (Concurrency): wrapped in an in-memory async lock so that
 * simultaneous "Call Next" requests from multiple receptionists are
 * serialized -- only one patient transitions to in-consultation per click.
 */
exports.callNext = async (req, res, next) => {
  try {
    const result = await callNextLock.runExclusive(async () => {
      const io = req.app.get('io');

      // Step 1: complete the current in-consultation patient, if any
      const current = await Patient.findOne({ status: 'in-consultation' }).sort({
        consultationStartTime: -1,
      });

      let completedPatient = null;
      if (current) {
        current.status = 'completed';
        current.consultationEndTime = new Date();
        await current.save();
        completedPatient = current;
      }

      // Step 2: find the next waiting patient (FIFO)
      // Use findOneAndUpdate for an atomic read-and-claim, mitigating races
      // even further at the database level.
      const next = await Patient.findOneAndUpdate(
        { status: 'waiting' },
        { $set: { status: 'in-consultation', consultationStartTime: new Date() } },
        { sort: { sequence: 1 }, new: true }
      );

      if (completedPatient) {
        io.emit(PATIENT_COMPLETED, {
          token: completedPatient.token,
          name: completedPatient.name,
        });
      }

      if (!next) {
        // Edge Case 1: queue is empty
        return { empty: true, completedPatient, currentToken: null };
      }

      io.emit(CALL_NEXT, { currentToken: next.token });

      return { empty: false, completedPatient, currentToken: next.token, nextPatient: next };
    });

    const io = req.app.get('io');
    const state = await broadcastQueueState(io);

    if (result.empty && !result.completedPatient) {
      return res.status(200).json({
        success: true,
        empty: true,
        message: 'No patients in queue',
        queueState: state,
      });
    }

    res.status(200).json({
      success: true,
      empty: result.empty,
      message: result.empty
        ? 'Last consultation completed. No patients in queue.'
        : 'Next patient called successfully.',
      currentToken: result.currentToken,
      data: result.nextPatient || null,
      queueState: state,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/patients/:id/complete
 * Manually marks a specific patient (typically the one currently in
 * consultation) as completed, without automatically calling the next patient.
 */
exports.markComplete = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    if (patient.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Patient is already completed.' });
    }

    patient.status = 'completed';
    patient.consultationEndTime = new Date();
    await patient.save();

    const io = req.app.get('io');
    io.emit(PATIENT_COMPLETED, { token: patient.token, name: patient.name });
    const state = await broadcastQueueState(io);

    res.json({ success: true, data: patient, queueState: state });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/patients/:id
 * Removes a patient from the active queue (soft delete: status -> 'removed').
 * Broadcasts patientRemoved + full state so both screens update instantly.
 */
exports.removePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    patient.status = 'removed';
    await patient.save();

    const io = req.app.get('io');
    io.emit(PATIENT_REMOVED, { token: patient.token, name: patient.name });
    const state = await broadcastQueueState(io);

    res.json({ success: true, message: 'Patient removed from queue.', queueState: state });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/patients/export
 * Exports the queue (excluding removed) as CSV.
 */
exports.exportCSV = async (req, res, next) => {
  try {
    const patients = await Patient.find({ status: { $ne: 'removed' } })
      .sort({ sequence: 1 })
      .lean();

    const header = ['Token', 'Name', 'Age', 'Phone', 'Join Time', 'Status', 'Consultation Start', 'Consultation End'];
    const rows = patients.map((p) => [
      p.token,
      p.name,
      p.age,
      p.phone,
      p.joinTime ? new Date(p.joinTime).toISOString() : '',
      p.status,
      p.consultationStartTime ? new Date(p.consultationStartTime).toISOString() : '',
      p.consultationEndTime ? new Date(p.consultationEndTime).toISOString() : '',
    ]);

    const escapeCSV = (value) => {
      const str = String(value ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [header, ...rows].map((row) => row.map(escapeCSV).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="queuecure-export-${Date.now()}.csv"`);
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
};
