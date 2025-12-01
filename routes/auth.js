const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

router.post(
  '/signup',
  [
    body('firstName').notEmpty().withMessage('First name is required')
                   .trim()
                   .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters'),
    body('lastName').notEmpty().withMessage('Last name is required')
                  .trim()
                  .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),
    body('emailOrMobile').notEmpty().withMessage('Email or mobile is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, emailOrMobile, password } = req.body;

    try {
      const userExists = await User.findOne({ emailOrMobile });
      if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const user = await User.create({ firstName, lastName, emailOrMobile, password });
      if (user) {
        res.status(201).json({ 
          _id: user._id, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          emailOrMobile: user.emailOrMobile, 
          token: generateToken(user._id) 
        });
      } else {
        res.status(400).json({ message: 'Invalid user data' });
      }
    } catch (error) {
      console.error('Signup Error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

router.post(
  '/login',
  [
    body('emailOrMobile').notEmpty().withMessage('Email or mobile is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { emailOrMobile, password } = req.body;

    try {
      // Use lean() for faster query when we don't need the full document
      const user = await User.findOne({ emailOrMobile }).lean().exec();
      if (user && (await bcrypt.compare(password, user.password))) {
        res.json({ 
          _id: user._id, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          emailOrMobile: user.emailOrMobile, 
          token: generateToken(user._id) 
        });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login Error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

module.exports = router;
