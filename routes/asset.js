const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const SentimentVote = require('../models/SentimentVote');
const TradeIntentVote = require('../models/TradeIntentVote');
const Comment = require('../models/Comment');

/* ---------------- Sentiment Poll ---------------- */
router.post('/:asset/sentiment', protect, async (req, res) => {
  try {
    const asset = String(req.params.asset).toUpperCase();
    const { sentiment } = req.body;
    if (!['bullish', 'bearish'].includes(sentiment)) {
      return res.status(400).json({ message: 'Invalid sentiment' });
    }

    const doc = await SentimentVote.findOneAndUpdate(
      { asset, user: req.user._id },
      { asset, user: req.user._id, sentiment },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // emit update to room
    const io = req.app.get('io');
    if (io) io.to(asset).emit('asset_update', { type: 'sentiment', asset });

    return res.json({ message: 'Vote recorded', id: doc?._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to record vote' });
  }
});

// Get current user's sentiment vote for this asset
router.get('/:asset/sentiment/me', protect, async (req, res) => {
  try {
    const asset = String(req.params.asset).toUpperCase();
    const doc = await SentimentVote.findOne({ asset, user: req.user._id }).lean();
    return res.json({ sentiment: doc?.sentiment || null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch your sentiment' });
  }
});

router.get('/:asset/sentiment', async (req, res) => {
  try {
    const asset = String(req.params.asset).toUpperCase();
    const agg = await SentimentVote.aggregate([
      { $match: { asset } },
      {
        $group: {
          _id: '$sentiment',
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = agg.reduce((obj, cur) => ({ ...obj, [cur._id]: cur.count }), {});
    const total = (counts.bullish || 0) + (counts.bearish || 0) || 1;
    return res.json({
      bullish: ((counts.bullish || 0) / total) * 100,
      bearish: ((counts.bearish || 0) / total) * 100,
      totalVotes: total,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch sentiment' });
  }
});

/* ---------------- Intent Poll ---------------- */
router.post('/:asset/intent', protect, async (req, res) => {
  try {
    const asset = String(req.params.asset).toUpperCase();
    const { action } = req.body;
    if (!['buy', 'sell', 'hold'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const doc = await TradeIntentVote.findOneAndUpdate(
      { asset, user: req.user._id },
      { asset, user: req.user._id, action },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const io = req.app.get('io');
    if (io) io.to(asset).emit('asset_update', { type: 'intent', asset });

    return res.json({ message: 'Intent recorded', id: doc?._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to record intent' });
  }
});

router.get('/:asset/intent', async (req, res) => {
  try {
    const asset = String(req.params.asset).toUpperCase();
    const agg = await TradeIntentVote.aggregate([
      { $match: { asset } },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = agg.reduce((o, c) => ({ ...o, [c._id]: c.count }), {});
    const total = ['buy', 'sell', 'hold'].reduce((n, k) => n + (counts[k] || 0), 0) || 1;
    return res.json({
      buy: ((counts.buy || 0) / total) * 100,
      sell: ((counts.sell || 0) / total) * 100,
      hold: ((counts.hold || 0) / total) * 100,
      totalVotes: total,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch intent stats' });
  }
});

/* ---------------- Comments ---------------- */
router.post('/:asset/comments', protect, async (req, res) => {
  try {
    const asset = String(req.params.asset).toUpperCase();
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Comment text required' });

    const doc = await Comment.create({ asset, user: req.user._id, text: text.trim() });

    const io = req.app.get('io');
    if (io) io.to(asset).emit('asset_update', { type: 'comment', asset, commentId: doc._id });

    return res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to add comment' });
  }
});

router.get('/:asset/comments', async (req, res) => {
  try {
    const asset = String(req.params.asset).toUpperCase();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);

    const docs = await Comment.find({ asset })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'emailOrMobile');

    return res.json(docs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch comments' });
  }
});

router.patch('/comments/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (String(comment.user) !== String(req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    comment.text = req.body.text ?? comment.text;
    await comment.save();

    const io = req.app.get('io');
    if (io) io.to(comment.asset).emit('asset_update', { type: 'comment_edit', asset: comment.asset, commentId: comment._id });

    return res.json(comment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to update comment' });
  }
});

router.delete('/comments/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (String(comment.user) !== String(req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    const asset = comment.asset;
    await comment.deleteOne();

    const io = req.app.get('io');
    if (io) io.to(asset).emit('asset_update', { type: 'comment_delete', asset, commentId: String(comment._id) });

    return res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete comment' });
  }
});

module.exports = router;
