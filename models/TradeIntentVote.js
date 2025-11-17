const mongoose = require('mongoose');

const tradeIntentSchema = new mongoose.Schema(
  {
    asset: { type: String, required: true, uppercase: true, trim: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: {
      type: String,
      enum: ['buy', 'sell', 'hold'],
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

tradeIntentSchema.index({ asset: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('TradeIntentVote', tradeIntentSchema);
