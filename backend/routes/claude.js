const express = require('express');
const router = express.Router();
const db = require('../services/db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const claudeService = require('../services/claude');

router.use(auth);
router.use(requireRole(['ADMIN']));

// Log Claude AI calls to claude_logs table
// Schema: feature (TEXT NOT NULL), prompt_text (TEXT), response_text (TEXT), tokens_used (INT)
const logCall = async (feature, promptText, responseText) => {
  try {
    await db.query(
      `INSERT INTO claude_logs (feature, prompt_text, response_text, tokens_used)
       VALUES ($1, $2, $3, $4)`,
      [feature, JSON.stringify(promptText), JSON.stringify(responseText), 0]
    );
  } catch (e) {
    console.error('Failed to log claude call:', e.message);
  }
};

// POST /anomaly
router.post('/anomaly', async (req, res) => {
  try {
    const result = await claudeService.anomalyDetection(req.body);
    await logCall('anomaly', req.body, result);
    res.json(result);
  } catch (err) {
    console.error('Claude anomaly error:', err);
    res.status(500).json({ error: 'Anomaly detection failed' });
  }
});

// POST /route-summary
router.post('/route-summary', async (req, res) => {
  try {
    const result = await claudeService.routeSummary(req.body);
    await logCall('route-summary', req.body, result);
    res.json(result);
  } catch (err) {
    console.error('Claude route-summary error:', err);
    res.status(500).json({ error: 'Route summary failed' });
  }
});

// POST /expiry-risk
router.post('/expiry-risk', async (req, res) => {
  try {
    const result = await claudeService.expiryRisk(req.body);
    await logCall('expiry-risk', req.body, result);
    res.json(result);
  } catch (err) {
    console.error('Claude expiry-risk error:', err);
    res.status(500).json({ error: 'Expiry risk analysis failed' });
  }
});

// POST /demand-forecast
router.post('/demand-forecast', async (req, res) => {
  try {
    const result = await claudeService.demandForecast(req.body);
    await logCall('demand-forecast', req.body, result);
    res.json(result);
  } catch (err) {
    console.error('Claude demand-forecast error:', err);
    res.status(500).json({ error: 'Demand forecast failed' });
  }
});

module.exports = router;
