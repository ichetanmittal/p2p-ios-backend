const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendVerificationEmail } = require('../services/emailService');

const router = express.Router();

// Generate verification code
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register route
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, phone } = req.body;
        console.log('📝 Registration attempt:', { email, name, phone });
        
        // Check if user already exists with email
        const existingUserEmail = await User.findOne({ email });
        if (existingUserEmail) {
            console.log('❌ Registration failed: Email already exists');
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Check if user already exists with phone
        const existingUserPhone = await User.findOne({ phone });
        if (existingUserPhone) {
            console.log('❌ Registration failed: Phone already exists');
            return res.status(400).json({ error: 'Phone number already registered' });
        }

        // Generate verification code
        const verificationCode = generateVerificationCode();
        const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Create new user
        const user = new User({
            email,
            password,
            name,
            phone,
            verificationCode,
            verificationCodeExpires,
            isVerified: false
        });
        await user.save();
        console.log('✅ User created successfully');

        // Send verification email
        await sendVerificationEmail(email, verificationCode);
        console.log('📧 Verification email sent');

        res.status(201).json({ 
            message: 'Please check your email for verification code',
            userId: user._id
        });
    } catch (error) {
        console.error('❌ Registration error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Verify email route
router.post('/verify', async (req, res) => {
    try {
        const { userId, code } = req.body;
        console.log('🔍 Verification attempt for user:', userId);

        const user = await User.findById(userId);
        if (!user) {
            console.log('❌ Verification failed: User not found');
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.isVerified) {
            console.log('ℹ️ User already verified');
            return res.status(400).json({ error: 'Email already verified' });
        }

        if (!user.verificationCode || !user.verificationCodeExpires) {
            console.log('❌ Verification failed: No verification code found');
            return res.status(400).json({ error: 'No verification code found' });
        }

        if (user.verificationCode !== code) {
            console.log('❌ Verification failed: Invalid code');
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        if (new Date() > user.verificationCodeExpires) {
            console.log('❌ Verification failed: Code expired');
            return res.status(400).json({ error: 'Verification code expired' });
        }

        // Update user verification status
        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpires = undefined;
        await user.save();
        console.log('✅ User verified successfully');

        // Generate token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
        console.log('🎟 JWT token generated');

        res.json({ 
            user: { 
                email: user.email,
                name: user.name,
                phone: user.phone 
            }, 
            token 
        });
    } catch (error) {
        console.error('❌ Verification error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        console.log('🔑 Login attempt with identifier:', identifier);
        
        // Find user by email or phone
        const user = await User.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { phone: identifier }
            ]
        });

        if (!user) {
            console.log('❌ Login failed: User not found');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user.isVerified) {
            console.log('❌ Login failed: Email not verified');
            return res.status(401).json({ error: 'Please verify your email first' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log('❌ Login failed: Invalid password');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
        console.log('✅ Login successful for user:', user.email);
        console.log('🎟 JWT token generated');

        res.json({ 
            user: { 
                email: user.email,
                name: user.name,
                phone: user.phone 
            }, 
            token 
        });
    } catch (error) {
        console.error('❌ Login error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
    console.log('👋 Profile requested for user:', req.user.email);
    res.json({ user: { email: req.user.email } });
});

module.exports = router;
