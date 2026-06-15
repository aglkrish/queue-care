const express = require('express');
const router = express.Router();
const {
  getAllPatients,
  getQueueStateHandler,
  addPatient,
  callNext,
  markComplete,
  removePatient,
  exportCSV,
} = require('../controllers/patientController');

// GET /api/patients - list all patients (supports ?status=, ?search=, ?page=, ?limit=)
router.get('/', getAllPatients);

// GET /api/patients/export - export queue as CSV
router.get('/export', exportCSV);

// GET /api/patients/queue-state - full computed queue state
router.get('/queue-state', getQueueStateHandler);

// POST /api/patients - add a new patient (generates token)
router.post('/', addPatient);

// POST /api/patients/call-next - call the next patient in queue
router.post('/call-next', callNext);

// PATCH /api/patients/:id/complete - mark a specific patient as completed
router.patch('/:id/complete', markComplete);

// DELETE /api/patients/:id - remove a patient from the queue
router.delete('/:id', removePatient);

module.exports = router;
