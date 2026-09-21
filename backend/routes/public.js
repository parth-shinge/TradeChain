const express = require('express');
const router = express.Router();
const db = require('../services/db');

// GET /verify/:orderCode — NO auth required (public endpoint)
router.get('/verify/:orderCode', async (req, res) => {
  try {
    const { orderCode } = req.params;

    const orderRes = await db.query(`
      SELECT o.*,
             ufrom.sap_name as from_name,
             uto.sap_name as to_name
      FROM orders o
      LEFT JOIN users ufrom ON o.from_sap_code = ufrom.sap_code
      LEFT JOIN users uto ON o.to_sap_code = uto.sap_code
      WHERE o.order_code = $1
    `, [orderCode]);

    if (orderRes.rows.length === 0) {
      return res.json({ verified: false, message: 'Not Found — Potential Counterfeit' });
    }

    const order = orderRes.rows[0];

    const itemsRes = await db.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [order.id]
    );

    res.json({
      verified: true,
      order: {
        order_code: order.order_code,
        bill_number: order.bill_number,
        status: order.status,
        sale_date: order.sale_date,
        created_at: order.created_at,
        delivery_timestamp: order.delivery_timestamp,
      },
      items: itemsRes.rows,
      chain_of_custody: {
        from_sap_code: order.from_sap_code,
        from_name: order.from_name,
        to_sap_code: order.to_sap_code,
        to_name: order.to_name,
      },
      temperature_history: {
        dispatch: order.temperature_at_dispatch,
        receipt: order.temperature_at_receipt,
      },
    });
  } catch (err) {
    console.error('Public verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// GET /batch/:batchNumber — NO auth required (public endpoint)
router.get('/batch/:batchNumber', async (req, res) => {
  try {
    const { batchNumber } = req.params;

    // Get batch + product info
    const batchRes = await db.query(`
      SELECT b.*, p.drug_name, p.material_sap_code, p.category,
             p.requires_cold_chain, p.max_temp_celsius
      FROM batches b
      JOIN products p ON b.product_id = p.id
      WHERE b.batch_number = $1
    `, [batchNumber]);

    // Get all orders containing this batch
    const journeyRes = await db.query(`
      SELECT
        o.order_code,
        o.status,
        o.from_sap_code,
        o.to_sap_code,
        o.created_at,
        o.delivery_timestamp,
        o.temperature_at_dispatch,
        o.temperature_at_receipt,
        oi.quantity_dispatched,
        oi.quantity_received
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.batch_number = $1
      ORDER BY o.created_at ASC
    `, [batchNumber]);

    res.json({
      batch_number: batchNumber,
      batch: batchRes.rows.length > 0 ? batchRes.rows[0] : null,
      journey: journeyRes.rows,
    });
  } catch (err) {
    console.error('Public batch error:', err);
    res.status(500).json({ error: 'Batch lookup failed' });
  }
});

module.exports = router;
