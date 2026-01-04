const express = require('express');
const router = express.Router();
const BetaSignup = require('../models/BetaSignup');
const { protect, admin } = require('../middleware/auth');

// @route   POST /api/beta/signup
// @desc    Register a user for beta access
// @access  Public
router.post('/signup', async (req, res) => {
    try {
        const { name, email, phone } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: 'Name and Email are required.' });
        }

        // Check if email already exists
        const existingUser = await BetaSignup.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'This email is already registered.' });
        }

        const newSignup = new BetaSignup({
            name,
            email,
            phone,
            ipAddress: req.ip
        });

        await newSignup.save();

        res.status(201).json({ message: 'Successfully signed up for beta access!' });
    } catch (error) {
        console.error('Beta signup error:', error);
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
});

// @route   GET /api/beta/export
// @desc    Export all signups (CSV format friendly)
// @access  Private/Admin
router.get('/export', protect, admin, async (req, res) => {
    try {
        const signups = await BetaSignup.find().sort({ signedUpAt: -1 });
        res.json(signups);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
