const express = require('express');
const router = express.Router();
const db = require('../services/db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { createSchemeOnChain, verifySchemeOnChain } = require('../services/blockchain');

router.use(auth);

// POST / — admin only
router.post('/', requireRole(['ADMIN']), async (req, res) => {
  try {
    const { title, productMaterialSapCode, validFrom, validTo, terms, termsHash } = req.body;

    const { rows } = await db.query(
      `INSERT INTO schemes (title, product_material_sap_code, valid_from, valid_to, terms, terms_hash, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
      [title, productMaterialSapCode, validFrom, validTo, terms, termsHash]
    );

    res.status(201).json(rows[0]);

    // Fire-and-forget blockchain call
    const scheme = rows[0];
    createSchemeOnChain(title, productMaterialSapCode || '', validFrom, validTo, termsHash || '')
      .then(async (result) => {
        if (result.success) {
          await db.query('UPDATE schemes SET blockchain_tx_hash = $1, blockchain_status = $2, blockchain_scheme_id = $3 WHERE id = $4', [result.txHash, 'CONFIRMED', result.onChainSchemeId, scheme.id]);
          console.log(`[Chain] Scheme ${scheme.id} confirmed: ${result.txHash} (onChainId: ${result.onChainSchemeId})`);
        } else {
          await db.query('UPDATE schemes SET blockchain_status = $1, blockchain_error = $2 WHERE id = $3', ['FAILED', result.error, scheme.id]);
          console.warn(`[Chain] Scheme ${scheme.id} failed: ${result.error}`);
        }
      }).catch(async (err) => {
        await db.query('UPDATE schemes SET blockchain_status = $1, blockchain_error = $2 WHERE id = $3', ['FAILED', err.message, scheme.id]).catch(() => {});
        console.error(`[Chain] Scheme ${scheme.id} error:`, err.message);
      });
  } catch (error) {
    console.error('Error creating scheme:', error);
    res.status(500).json({ error: 'Failed to create scheme' });
  }
});

// GET / — list schemes (active only by default, ?all=true for admin to see everything)
router.get('/', async (req, res) => {
  try {
    const { productSap, all } = req.query;

    let query = 'SELECT * FROM schemes';
    const params = [];
    const conditions = [];

    // Default: only active. ?all=true bypasses this (admin "All Schemes" table)
    if (all !== 'true') {
      conditions.push('is_active = true');
    }

    if (productSap) {
      params.push(productSap);
      conditions.push(`product_material_sap_code = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error listing schemes:', error);
    res.status(500).json({ error: 'Failed to list schemes' });
  }
});

// GET /:id/verify — real on-chain verification with DB fallback
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

    // Try real on-chain verification using numeric blockchain_scheme_id
    let onChainVerified = null;
    let verificationSource = 'database';
    if (scheme.blockchain_scheme_id) {
      try {
        const chainResult = await verifySchemeOnChain(scheme.blockchain_scheme_id);
        if (chainResult) {
          onChainVerified = chainResult.currentlyActive;
          verificationSource = 'blockchain';
        }
      } catch (chainErr) {
        console.warn(`[Chain] Verify scheme ${id} fallback to DB:`, chainErr.message);
      }
    }

    res.json({
      ...scheme,
      isActiveCurrently,
      onChainVerified,
      verificationSource,
    });
  } catch (error) {
    console.error('Error verifying scheme:', error);
    res.status(500).json({ error: 'Failed to verify scheme' });
  }
});

module.exports = router;
