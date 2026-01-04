const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema(
    {
        newsId: { type: mongoose.Schema.Types.ObjectId, ref: 'News', required: false },
        category: { type: String, default: 'news' }, // 'news' or 'prediction'
        question: { type: String, required: true, trim: true },
        options: [
            {
                text: { type: String, required: true },
                votes: { type: Number, default: 0 }
            }
        ],
        voters: [{ type: mongoose.Schema.Types.Mixed }], // Store user IDs or IPs to prevent double voting
        aiSummary: { type: String, default: '' },
        expiresAt: { type: Date }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Poll', pollSchema);
