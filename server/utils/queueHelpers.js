const Patient = require('../models/Patient');
const Settings = require('../models/Settings');

/**
 * Computes the full, current queue state needed by both the receptionist
 * dashboard and the patient waiting room display.
 *
 * Estimated wait time is ALWAYS computed dynamically from:
 *   estimatedWait (minutes) = positionInQueue (0-indexed, patients ahead) * averageConsultationTime
 *
 * Never hardcoded.
 *
 * @returns {Promise<{
 *   currentToken: string|null,
 *   currentPatient: object|null,
 *   waitingList: Array<object>,
 *   averageConsultationTime: number,
 *   totalWaiting: number,
 *   servedToday: number,
 * }>}
 */
async function getQueueState() {
  const settings = await Settings.findOne().lean();
  const averageConsultationTime = settings ? settings.averageConsultationTime : 10;

  // Patient currently being seen
  const currentPatient = await Patient.findOne({ status: 'in-consultation' })
    .sort({ consultationStartTime: -1 })
    .lean();

  // Waiting patients in FIFO order
  const waitingPatientsRaw = await Patient.find({ status: 'waiting' })
    .sort({ sequence: 1 })
    .lean();

  const waitingList = waitingPatientsRaw.map((p, index) => ({
    _id: p._id,
    token: p.token,
    name: p.name,
    age: p.age,
    phone: p.phone,
    joinTime: p.joinTime,
    status: p.status,
    position: index + 1, // 1-indexed position in queue
    patientsAhead: index, // number of people ahead of this patient
    estimatedWaitMinutes: index * averageConsultationTime,
  }));

  const totalWaiting = waitingList.length;

  // Patients served today = completed today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const servedToday = await Patient.countDocuments({
    status: 'completed',
    consultationEndTime: { $gte: startOfToday },
  });

  return {
    currentToken: currentPatient ? currentPatient.token : null,
    currentPatient: currentPatient || null,
    waitingList,
    averageConsultationTime,
    totalWaiting,
    servedToday,
  };
}

module.exports = { getQueueState };
