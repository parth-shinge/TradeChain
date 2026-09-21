const express = require('express');
const router = express.Router();
const db = require('../services/db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// POST /
router.post('/', auth, requireRole(['ADMIN']), async (req, res) => {
    try {
        const { productId, batchNumber, manufactureDate, expiryDate, quantityManufactured, labReportIpfsHash } = req.body;

        const query = `
            INSERT INTO batches (product_id, batch_number, manufacture_date, expiry_date, quantity_manufactured, lab_report_ipfs_hash)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const values = [productId, batchNumber, manufactureDate, expiryDate, quantityManufactured, labReportIpfsHash];

        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding batch:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /expiring — MUST be before /:batchNumber
router.get('/expiring', auth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const query = `
            SELECT b.*, p.drug_name, p.material_sap_code, p.category
            FROM batches b
            JOIN products p ON b.product_id = p.id
            WHERE b.expiry_date <= CURRENT_DATE + $1 * INTERVAL '1 day'
            ORDER BY b.expiry_date ASC
        `;

        const result = await db.query(query, [days]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching expiring batches:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /:batchNumber
router.get('/:batchNumber', auth, async (req, res) => {
    try {
        const { batchNumber } = req.params;

        const batchResult = await db.query(
            `SELECT b.*, p.drug_name, p.material_sap_code, p.category, p.requires_cold_chain, p.max_temp_celsius
             FROM batches b
             JOIN products p ON b.product_id = p.id
             WHERE b.batch_number = $1`,
            [batchNumber]
        );

        if (batchResult.rows.length === 0) {
            return res.status(404).json({ error: 'Batch not found' });
        }

        const batch = batchResult.rows[0];

        const ordersResult = await db.query(
            `SELECT o.order_code, o.status, o.from_sap_code, o.to_sap_code, o.created_at,
                    oi.quantity_dispatched, oi.quantity_received
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             WHERE oi.batch_number = $1
             ORDER BY o.created_at ASC`,
            [batchNumber]
        );

        batch.orders = ordersResult.rows;
        res.json(batch);
    } catch (error) {
        console.error('Error fetching batch details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
