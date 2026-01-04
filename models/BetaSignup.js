const mongoose = require('mongoose');

const betaSignupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    ipAddress: {
        type: String
    },
    signedUpAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('BetaSignup', betaSignupSchema);
