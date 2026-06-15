const Patient = require('../models/Patient');
const Settings = require('../models/Settings');

/**
 * GET /api/analytics
 * Returns aggregated data for dashboard charts:
 *  - patientsServedToday (count)
 *  - averageWaitTimeMinutes (actual measured wait, based on joinTime -> consultationStartTime)
 *  - queueLengthTrend (waiting-count snapshots over the last N hours, bucketed hourly)
 *  - hourlyServed (patients completed per hour today)
 */
exports.getAnalytics = async (req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 1. Patients served today
    const patientsServedToday = await Patient.countDocuments({
      status: 'completed',
      consultationEndTime: { $gte: startOfToday },
    });

    // 2. Average actual wait time (joinTime -> consultationStartTime) for patients
    //    who have started/completed consultation today
    const waitTimeAgg = await Patient.aggregate([
      {
        $match: {
          consultationStartTime: { $ne: null, $gte: startOfToday },
        },
      },
      {
        $project: {
          waitMinutes: {
            $divide: [{ $subtract: ['$consultationStartTime', '$joinTime'] }, 60000],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgWait: { $avg: '$waitMinutes' },
          count: { $sum: 1 },
        },
      },
    ]);

    const averageWaitTimeMinutes = waitTimeAgg.length > 0 ? Math.round(waitTimeAgg[0].avgWait * 10) / 10 : 0;

    // 3. Hourly served counts for today (for bar chart)
    const hourlyServedAgg = await Patient.aggregate([
      {
        $match: {
          status: 'completed',
          consultationEndTime: { $gte: startOfToday },
        },
      },
      {
        $group: {
          _id: { $hour: '$consultationEndTime' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const hourlyServed = Array.from({ length: 24 }, (_, hour) => {
      const found = hourlyServedAgg.find((h) => h._id === hour);
      return { hour, count: found ? found.count : 0 };
    });

    // 4. Current queue length trend: snapshot based on join times today, bucketed by hour
    //    (approximation of how the waiting queue has grown over the day)
    const queueTrendAgg = await Patient.aggregate([
      {
        $match: {
          joinTime: { $gte: startOfToday },
        },
      },
      {
        $group: {
          _id: { $hour: '$joinTime' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const queueLengthTrend = Array.from({ length: 24 }, (_, hour) => {
      const found = queueTrendAgg.find((h) => h._id === hour);
      return { hour, count: found ? found.count : 0 };
    });

    const settings = await Settings.findOne().lean();
    const averageConsultationTime = settings ? settings.averageConsultationTime : 10;

    const currentWaiting = await Patient.countDocuments({ status: 'waiting' });

    res.json({
      success: true,
      data: {
        patientsServedToday,
        averageWaitTimeMinutes,
        averageConsultationTime,
        currentWaiting,
        hourlyServed,
        queueLengthTrend,
      },
    });
  } catch (err) {
    next(err);
  }
};
