const express = require('express');
const router = express.Router();
const db = require('../services/db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.use(auth);
router.use(requireRole(['ADMIN']));

// GET /overview
router.get('/overview', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*)::int as total_orders,
        SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END)::int as total_delivered,
        SUM(CASE WHEN status = 'DISPUTED' THEN 1 ELSE 0 END)::int as total_disputed,
        ROUND(SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as fulfilment_rate,
        ROUND(SUM(CASE WHEN status = 'DISPUTED' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as dispute_rate
      FROM orders
    `);

    const coldChain = await db.query(`
      SELECT COUNT(DISTINCT o.id)::int as violations
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.material_sap_code = p.material_sap_code
      WHERE p.requires_cold_chain = true
        AND o.temperature_at_receipt IS NOT NULL
        AND p.max_temp_celsius IS NOT NULL
        AND o.temperature_at_receipt > p.max_temp_celsius
    `);

    const data = result.rows[0];
    data.cold_chain_violations = parseInt(coldChain.rows[0].violations) || 0;

    res.json(data);
  } catch (err) {
    console.error('Analytics overview error:', err);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

// GET /fulfilment
router.get('/fulfilment', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        u.sap_name as distributor_name,
        o.from_sap_code,
        COUNT(o.id)::int as total_orders,
        SUM(CASE WHEN o.status = 'DELIVERED' THEN 1 ELSE 0 END)::int as delivered_orders
      FROM orders o
      JOIN users u ON o.from_sap_code = u.sap_code
      WHERE u.role = 'DISTRIBUTOR'
      GROUP BY o.from_sap_code, u.sap_name
      ORDER BY total_orders DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Analytics fulfilment error:', err);
    res.status(500).json({ error: 'Failed to fetch fulfilment data' });
  }
});

// GET /cold-chain
router.get('/cold-chain', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        u.region,
        u.city,
        COUNT(o.id)::int as violations
      FROM orders o
      JOIN users u ON o.to_sap_code = u.sap_code
      WHERE o.status = 'DISPUTED'
        AND o.temperature_at_receipt IS NOT NULL
      GROUP BY u.region, u.city
      ORDER BY violations DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Analytics cold-chain error:', err);
    res.status(500).json({ error: 'Failed to fetch cold chain data' });
  }
});

// GET /movement
router.get('/movement', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        oi.material_sap_code,
        p.drug_name,
        SUM(oi.quantity_dispatched)::int as total_dispatched
      FROM order_items oi
      LEFT JOIN products p ON oi.material_sap_code = p.material_sap_code
      GROUP BY oi.material_sap_code, p.drug_name
      ORDER BY total_dispatched DESC
      LIMIT 20
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Analytics movement error:', err);
    res.status(500).json({ error: 'Failed to fetch movement data' });
  }
});

module.exports = router;
