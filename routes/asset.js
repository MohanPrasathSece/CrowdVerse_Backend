const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const SentimentVote = require('../models/SentimentVote');
const TradeIntentVote = require('../models/TradeIntentVote');
const Comment = require('../models/Comment');
const geminiService = require('../services/geminiService');
const groqService = require('../services/groqService');

/* ---------------- Sentiment Poll ---------------- */
router.post('/:asset/sentiment', protect, async (req, res) => {
  try {
    const asset = String(req.params.asset).toUpperCase();
    const { sentiment } = req.body;
    if (!['bullish', 'bearish'].includes(sentiment)) {
      return res.status(400).json({ message: 'Invalid sentiment' });
    }

    const doc = await SentimentVote.findOneAndUpdate(
      { asset, user: req.user.isGuest ? req.user.id : req.user._id },
      { asset, user: req.user.isGuest ? req.user.id : req.user._id, sentiment },
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
      { asset, user: req.user.isGuest ? req.user.id : req.user._id },
      { asset, user: req.user.isGuest ? req.user.id : req.user._id, action },
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

router.get('/:asset/intent/me', protect, async (req, res) => {
  try {
    const asset = String(req.params.asset).toUpperCase();
    const userId = req.user.id;

    const vote = await TradeIntentVote.findOne({ asset, user: userId });

    if (!vote) {
      return res.json({ intent: null });
    }

    return res.json({ intent: vote.action });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch user intent' });
  }
});

/* ---------------- Comments ---------------- */
router.post('/:asset/comments', protect, async (req, res) => {
  try {
    const asset = String(req.params.asset).toUpperCase();
    const { text, parentId } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Comment text required' });

    // Validate parentId if provided
    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      if (!parentComment || parentComment.asset !== asset) {
        return res.status(400).json({ message: 'Invalid parent comment' });
      }
    }

    // Analyze comment sentiment with AI
    let sentimentAnalysis = null;
    try {
      const groqAvailable = await groqService.isAvailable();
      const geminiAvailable = await geminiService.isAvailable();

      if (groqAvailable || geminiAvailable) {
        const prompt = `Analyze the sentiment of this financial comment and provide a JSON response with:
        1. sentiment: "bullish", "bearish", or "neutral"
        2. confidence: a number from 0 to 1
        3. key_points: array of main points mentioned
        4. category: "technical", "fundamental", "news", or "general"
        
        Comment: "${text}"
        
        Respond with only valid JSON, no other text.`;

        let analysis;
        if (groqAvailable) {
          analysis = await groqService.generateSummary(prompt);
        } else {
          analysis = await geminiService.generateSummary(prompt);
        }

        if (analysis) {
          try {
            sentimentAnalysis = JSON.parse(analysis.final_summary || '{}');
            console.log(`🤖 [COMMENT] ${groqAvailable ? 'Groq' : 'Gemini'} analyzed comment sentiment: ${sentimentAnalysis.sentiment}`);
          } catch (parseError) {
            console.warn('⚠️ [COMMENT] Could not parse AI sentiment analysis');
          }
        }
      }
    } catch (error) {
      console.error('❌ [COMMENT] AI sentiment analysis failed:', error);
    }

    const doc = await Comment.create({
      asset,
      user: req.user.isGuest ? {
        _id: req.user.id,
        id: req.user.id,
        firstName: req.user.firstName,
        emailOrMobile: req.user.emailOrMobile,
        isGuest: true
      } : req.user._id,
      text: text.trim(),
      parentId: parentId || null,
      sentiment: sentimentAnalysis?.sentiment || null,
      sentimentConfidence: sentimentAnalysis?.confidence || null,
      keyPoints: sentimentAnalysis?.key_points || [],
      category: sentimentAnalysis?.category || 'general'
    });

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
      .populate('parentId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Manually populate users since 'user' field is Mixed
    const User = require('../models/User');
    const mongoose = require('mongoose');

    const registeredIds = docs
      .filter(d => {
        const u = d.user;
        if (!u) return false;
        if (typeof u === 'object') return false; // Already populated or guest object
        // Check if valid ObjectId string
        return mongoose.Types.ObjectId.isValid(u) || (typeof u === 'string' && u.length === 24);
      })
      .map(d => d.user);

    if (registeredIds.length > 0) {
      const users = await User.find({ _id: { $in: registeredIds } })
        .select('firstName lastName emailOrMobile isGuest')
        .lean();

      const userMap = {};
      users.forEach(u => { userMap[u._id.toString()] = u; });

      // Attach user details
      docs.forEach(d => {
        if (d.user && (mongoose.Types.ObjectId.isValid(d.user) || typeof d.user === 'string')) {
          const u = userMap[d.user.toString()];
          if (u) {
            d.user = u;
          }
        }
      });
    }

    console.log(`[DEBUG] Successfully fetched ${docs.length} comments for ${asset}.`);
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

    // Check ownership for both registered and guest users
    const commentUserId = comment.user.isGuest ? comment.user.id : comment.user;
    const currentUserId = req.user.isGuest ? req.user.id : req.user._id;

    if (String(commentUserId) !== String(currentUserId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

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

    // Check ownership for both registered and guest users
    const commentUserId = comment.user.isGuest ? comment.user.id : comment.user;
    const currentUserId = req.user.isGuest ? req.user.id : req.user._id;

    if (String(commentUserId) !== String(currentUserId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

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
