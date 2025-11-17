const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    asset: { type: String, required: true, uppercase: true, trim: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);
