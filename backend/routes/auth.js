const express = require('express');
const router = express.Router();
const db = require('../services/db');
const auth = require('../middleware/auth');
const { ethers } = require('ethers');

// POST /verify
router.post('/verify', async (req, res) => {
    try {
        const { walletAddress, signature, message } = req.body;
        
        if (!walletAddress || !signature || !message) {
            return res.status(400).json({ error: 'Missing authentication fields' });
        }

        try {
            // Recover the public address from the signature and the message string
            const recoveredAddress = ethers.verifyMessage(message, signature);
            
            // Compare the recovered address to the claimed address (case-insensitive)
            if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                return res.status(401).json({ error: 'Signature verification failed: Address mismatch' });
            }
        } catch (err) {
            console.error('Signature recovery error:', err.message);
            return res.status(401).json({ error: 'Invalid signature format' });
        }
        
        const result = await db.query(
            'SELECT * FROM users WHERE wallet_address = $1',
            [walletAddress]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error verifying user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /register
router.post('/register', async (req, res) => {
    try {
        const { walletAddress, sapCode, sapName, role, drugLicenseNo, mobileNo, city, region } = req.body;
        
        const query = `
            INSERT INTO users (wallet_address, sap_code, sap_name, role, drug_license_no, mobile_no, city, region, approved)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
            RETURNING *
        `;
        const values = [walletAddress, sapCode, sapName, role, drugLicenseNo, mobileNo, city, region];
        
        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /me
router.get('/me', auth, (req, res) => {
    res.json(req.user);
});

module.exports = router;
