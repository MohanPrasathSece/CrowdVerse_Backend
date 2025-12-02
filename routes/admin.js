const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Comment = require('../models/Comment');
const SentimentVote = require('../models/SentimentVote');
const TradeIntentVote = require('../models/TradeIntentVote');
const Intelligence = require('../models/Intelligence');
const MarketSnapshot = require('../models/MarketSnapshot');

const requireAdmin = async (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: 'Admin access only' });
  }
  next();
};

router.get('/stats', protect, requireAdmin, async (_req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      users,
      usersToday,
      usersLast7Days,
      comments,
      commentsToday,
      commentsLast7Days,
      sentimentVotes,
      tradeVotes,
      dailyActiveUsers,
      sentimentPolls,
      intentPolls,
      aiAnalyses,
      marketSnapshots,
      topCommented,
      topSentiment,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Comment.countDocuments({}),
      Comment.countDocuments({ createdAt: { $gte: startOfToday } }),
      Comment.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      SentimentVote.countDocuments({}),
      TradeIntentVote.countDocuments({}),
      Promise.all([
        Comment.distinct('user', { createdAt: { $gte: startOfToday } }).exec(),
        SentimentVote.distinct('user', { createdAt: { $gte: startOfToday } }).exec(),
        TradeIntentVote.distinct('user', { createdAt: { $gte: startOfToday } }).exec(),
      ]).then(([commentUsers, sentimentUsers, intentUsers]) => {
        const ids = new Set();
        [...(commentUsers || []), ...(sentimentUsers || []), ...(intentUsers || [])].forEach((u) => {
          if (u) ids.add(String(u._id || u.id || u));
        });
        return ids.size;
      }),
      SentimentVote.distinct('asset').exec(),
      TradeIntentVote.distinct('asset').exec(),
      Intelligence.countDocuments({}),
      MarketSnapshot.countDocuments({}),
      Comment.aggregate([
        { $group: { _id: '$asset', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      SentimentVote.aggregate([
        { $group: { _id: '$asset', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const pollAssets = new Set([...(sentimentPolls || []), ...(intentPolls || [])]);

    return res.json({
      users,
      usersToday,
      usersLast7Days,
      comments,
      commentsToday,
      commentsLast7Days,
      sentimentVotes,
      tradeVotes,
      dailyActiveUsers,
      polls: pollAssets.size,
      aiAnalyses,
      marketSnapshots,
      topCommentedAssets: topCommented.map((x) => ({ asset: x._id, count: x.count })),
      topSentimentAssets: topSentiment.map((x) => ({ asset: x._id, count: x.count })),
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ message: 'Failed to fetch admin stats' });
  }
});

module.exports = router;
