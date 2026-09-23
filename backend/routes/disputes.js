const express = require('express');
const router = express.Router();
const db = require('../services/db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { raiseDisputeOnChain, resolveDisputeOnChain, rejectDisputeOnChain } = require('../services/blockchain');

router.use(auth);

// GET /order/:orderCode — must be before /:id routes
router.get('/order/:orderCode', async (req, res) => {
  try {
    const { orderCode } = req.params;
    const query = `
      SELECT d.*
      FROM disputes d
      JOIN orders o ON d.order_id = o.id
      WHERE o.order_code = $1
      ORDER BY d.created_at DESC
    `;
    const { rows } = await db.query(query, [orderCode]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get order disputes' });
  }
});

// GET /
router.get('/', async (req, res) => {
  try {
    const { role, sap_code } = req.user;

    if (role === 'ADMIN') {
      const { rows } = await db.query('SELECT * FROM disputes ORDER BY created_at DESC');
      return res.json(rows);
    } else {
      const query = `
        SELECT d.* FROM disputes d
        LEFT JOIN orders o ON d.order_id = o.id
        WHERE d.raised_by_sap_code = $1 OR o.from_sap_code = $1 OR o.to_sap_code = $1
        ORDER BY d.created_at DESC
      `;
      const { rows } = await db.query(query, [sap_code]);
      return res.json(rows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to list disputes' });
  }
});

// POST /
router.post('/', requireRole(['CFA', 'DISTRIBUTOR', 'STOCKIST', 'PHARMACY']), async (req, res) => {
  try {
    const { orderCode, reason, description, evidenceIpfsHash } = req.body;
    const { sap_code } = req.user;

    const orderRes = await db.query('SELECT id FROM orders WHERE order_code = $1', [orderCode]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderId = orderRes.rows[0].id;

    const insertRes = await db.query(
      `INSERT INTO disputes (order_id, raised_by_sap_code, reason, description, evidence_ipfs_hash, status)
       VALUES ($1, $2, $3, $4, $5, 'OPEN') RETURNING *`,
      [orderId, sap_code, reason, description, evidenceIpfsHash]
    );

    res.status(201).json(insertRes.rows[0]);

    // Fire-and-forget blockchain call
    const dispute = insertRes.rows[0];
    // Look up raiser's wallet address for the on-chain call
    db.query('SELECT wallet_address FROM users WHERE sap_code = $1', [sap_code])
      .then(async (userRes) => {
        const raiserAddress = userRes.rows[0]?.wallet_address;
        if (!raiserAddress) {
          await db.query('UPDATE disputes SET blockchain_status = $1, blockchain_error = $2 WHERE id = $3', ['FAILED', 'Raiser wallet not found', dispute.id]);
          return;
        }
        return raiseDisputeOnChain(orderCode, reason, evidenceIpfsHash || '', raiserAddress);
      })
      .then(async (result) => {
        if (!result) return;
        if (result.success) {
          await db.query('UPDATE disputes SET blockchain_tx_hash = $1, blockchain_status = $2 WHERE id = $3', [result.txHash, 'CONFIRMED', dispute.id]);
          console.log(`[Chain] Dispute ${dispute.id} confirmed: ${result.txHash}`);
        } else {
          await db.query('UPDATE disputes SET blockchain_status = $1, blockchain_error = $2 WHERE id = $3', ['FAILED', result.error, dispute.id]);
          console.warn(`[Chain] Dispute ${dispute.id} failed: ${result.error}`);
        }
      }).catch(async (err) => {
        await db.query('UPDATE disputes SET blockchain_status = $1, blockchain_error = $2 WHERE id = $3', ['FAILED', err.message, dispute.id]).catch(() => {});
        console.error(`[Chain] Dispute ${dispute.id} error:`, err.message);
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create dispute' });
  }
});

// PATCH /:id/resolve
router.patch('/:id/resolve', requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    const { rows } = await db.query(
      'UPDATE disputes SET status = $1, resolution_notes = $2, resolved_at = NOW() WHERE id = $3 RETURNING *',
      ['RESOLVED', resolutionNotes, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    res.json(rows[0]);

    // Fire-and-forget blockchain call
    resolveDisputeOnChain(id, resolutionNotes || '')
      .then(async (result) => {
        if (result.success) {
          await db.query('UPDATE disputes SET blockchain_tx_hash = $1, blockchain_status = $2 WHERE id = $3', [result.txHash, 'CONFIRMED', id]);
          console.log(`[Chain] Resolve dispute ${id}: ${result.txHash}`);
        } else {
          await db.query('UPDATE disputes SET blockchain_status = $1, blockchain_error = $2 WHERE id = $3', ['FAILED', result.error, id]);
          console.warn(`[Chain] Resolve dispute ${id} failed: ${result.error}`);
        }
      }).catch(async (err) => {
        await db.query('UPDATE disputes SET blockchain_status = $1, blockchain_error = $2 WHERE id = $3', ['FAILED', err.message, id]).catch(() => {});
        console.error(`[Chain] Resolve dispute ${id} error:`, err.message);
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

// PATCH /:id/reject
router.patch('/:id/reject', requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    const { rows } = await db.query(
      'UPDATE disputes SET status = $1, resolution_notes = $2, resolved_at = NOW() WHERE id = $3 RETURNING *',
      ['REJECTED', resolutionNotes, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    res.json(rows[0]);

    // Fire-and-forget blockchain call
    rejectDisputeOnChain(id, resolutionNotes || '')
      .then(async (result) => {
        if (result.success) {
          await db.query('UPDATE disputes SET blockchain_tx_hash = $1, blockchain_status = $2 WHERE id = $3', [result.txHash, 'CONFIRMED', id]);
          console.log(`[Chain] Reject dispute ${id}: ${result.txHash}`);
        } else {
          await db.query('UPDATE disputes SET blockchain_status = $1, blockchain_error = $2 WHERE id = $3', ['FAILED', result.error, id]);
          console.warn(`[Chain] Reject dispute ${id} failed: ${result.error}`);
        }
      }).catch(async (err) => {
        await db.query('UPDATE disputes SET blockchain_status = $1, blockchain_error = $2 WHERE id = $3', ['FAILED', err.message, id]).catch(() => {});
        console.error(`[Chain] Reject dispute ${id} error:`, err.message);
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject dispute' });
  }
});

module.exports = router;
