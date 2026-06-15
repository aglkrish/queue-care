const express = require('express');
const router = express.Router();
const { getSettings, updateAverageTime } = require('../controllers/settingsController');

// GET /api/settings - get current settings
router.get('/', getSettings);

// PUT /api/settings/average-time - update average consultation time
router.put('/average-time', updateAverageTime);

module.exports = router;
