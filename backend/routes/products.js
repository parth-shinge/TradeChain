const express = require('express');
const router = express.Router();
const db = require('../services/db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// GET /
router.get('/', auth, async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = 'SELECT * FROM products WHERE 1=1';
        const values = [];
        let paramIndex = 1;

        if (category) {
            query += ` AND category = $${paramIndex}`;
            values.push(category);
            paramIndex++;
        }

        if (search) {
            query += ` AND (drug_name ILIKE $${paramIndex} OR material_sap_code ILIKE $${paramIndex})`;
            values.push(`%${search}%`);
            paramIndex++;
        }

        query += ' ORDER BY created_at DESC';
        const result = await db.query(query, values);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /
router.post('/', auth, requireRole(['ADMIN']), async (req, res) => {
    try {
        const { materialSapCode, drugName, genericName, hsnCode, category, requiresColdChain, maxTempCelsius, shelfLifeDays, schedule } = req.body;

        const query = `
            INSERT INTO products (material_sap_code, drug_name, generic_name, hsn_code, category, requires_cold_chain, max_temp_celsius, shelf_life_days, schedule)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const values = [materialSapCode, drugName, genericName, hsnCode, category, requiresColdChain, maxTempCelsius, shelfLifeDays, schedule];

        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /:sapCode
router.get('/:sapCode', auth, async (req, res) => {
    try {
        const { sapCode } = req.params;
        const result = await db.query(
            'SELECT * FROM products WHERE material_sap_code = $1',
            [sapCode]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /:sapCode
router.put('/:sapCode', auth, requireRole(['ADMIN']), async (req, res) => {
    try {
        const { sapCode } = req.params;
        const { drugName, genericName, hsnCode, category, requiresColdChain, maxTempCelsius, shelfLifeDays, schedule } = req.body;

        const query = `
            UPDATE products
            SET drug_name = $1, generic_name = $2, hsn_code = $3, category = $4, requires_cold_chain = $5, max_temp_celsius = $6, shelf_life_days = $7, schedule = $8
            WHERE material_sap_code = $9
            RETURNING *
        `;
        const values = [drugName, genericName, hsnCode, category, requiresColdChain, maxTempCelsius, shelfLifeDays, schedule, sapCode];

        const result = await db.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
