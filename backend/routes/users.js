const express = require('express');
const router = express.Router();
const db = require('../services/db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// GET /pending — must be before /:id routes
router.get('/pending', auth, requireRole(['ADMIN']), async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM users WHERE approved = false ORDER BY registered_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching pending users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /
router.get('/', auth, requireRole(['ADMIN']), async (req, res) => {
    try {
        const { role, search } = req.query;
        let query = 'SELECT * FROM users WHERE 1=1';
        const values = [];
        let paramIndex = 1;

        if (role) {
            query += ` AND role = $${paramIndex}`;
            values.push(role);
            paramIndex++;
        }

        if (search) {
            query += ` AND (sap_name ILIKE $${paramIndex} OR sap_code ILIKE $${paramIndex} OR wallet_address ILIKE $${paramIndex})`;
            values.push(`%${search}%`);
            paramIndex++;
        }

        query += ' ORDER BY registered_at DESC';
        const result = await db.query(query, values);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /:id/approve
router.patch('/:id/approve', auth, requireRole(['ADMIN']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'UPDATE users SET approved = true WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error approving user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /:id/reject
router.patch('/:id/reject', auth, requireRole(['ADMIN']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'DELETE FROM users WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User rejected and deleted' });
    } catch (error) {
        console.error('Error rejecting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
