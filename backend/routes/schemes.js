const express = require('express');
const router = express.Router();
const db = require('../services/db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.use(auth);

// POST / — admin only
router.post('/', requireRole(['ADMIN']), async (req, res) => {
  try {
    const { title, productMaterialSapCode, validFrom, validTo, termsHash } = req.body;

    const { rows } = await db.query(
      `INSERT INTO schemes (title, product_material_sap_code, valid_from, valid_to, terms_hash, is_active)
       VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
      [title, productMaterialSapCode, validFrom, validTo, termsHash]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating scheme:', error);
    res.status(500).json({ error: 'Failed to create scheme' });
  }
});

// GET / — list active schemes
router.get('/', async (req, res) => {
  try {
    const { productSap } = req.query;

    let query = 'SELECT * FROM schemes WHERE is_active = true';
    const params = [];

    if (productSap) {
      query += ' AND product_material_sap_code = $1';
      params.push(productSap);
    }

    query += ' ORDER BY created_at DESC';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error listing schemes:', error);
    res.status(500).json({ error: 'Failed to list schemes' });
  }
});

// GET /:id/verify
router.get('/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await db.query('SELECT * FROM schemes WHERE id = $1', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Scheme not found' });
    }

    const scheme = rows[0];
    const now = new Date();
    const validFrom = new Date(scheme.valid_from);
    const validTo = new Date(scheme.valid_to);

    const isActiveCurrently = scheme.is_active && now >= validFrom && now <= validTo;

    res.json({ ...scheme, isActiveCurrently });
  } catch (error) {
    console.error('Error verifying scheme:', error);
    res.status(500).json({ error: 'Failed to verify scheme' });
  }
});

module.exports = router;
