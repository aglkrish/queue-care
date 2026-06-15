const Settings = require('../models/Settings');
const { getQueueState } = require('../utils/queueHelpers');
const { AVERAGE_TIME_UPDATED, QUEUE_STATE } = require('../sockets/events');

/**
 * GET /api/settings
 * Returns the current clinic settings (creating defaults if none exist).
 */
exports.getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne().lean();
    if (!settings) {
      settings = await Settings.create({});
      settings = settings.toObject();
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/settings/average-time
 * Updates the average consultation time (in minutes).
 * Broadcasts `averageTimeUpdated` + recomputed full queue state, since every
 * waiting patient's estimated wait time depends on this value.
 */
exports.updateAverageTime = async (req, res, next) => {
  try {
    const { averageConsultationTime } = req.body;

    const value = Number(averageConsultationTime);
    if (isNaN(value) || value < 1 || value > 240) {
      return res.status(400).json({
        success: false,
        message: 'Average consultation time must be a number between 1 and 240 minutes.',
      });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({ averageConsultationTime: value });
    } else {
      settings.averageConsultationTime = value;
      await settings.save();
    }

    const io = req.app.get('io');
    io.emit(AVERAGE_TIME_UPDATED, { averageConsultationTime: value });

    const state = await getQueueState();
    io.emit(QUEUE_STATE, state);

    res.json({ success: true, data: settings, queueState: state });
  } catch (err) {
    next(err);
  }
};
