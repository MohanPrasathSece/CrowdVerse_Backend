const express = require('express');
const router = express.Router();
const News = require('../models/News');
const Poll = require('../models/Poll');
const Comment = require('../models/Comment');
const geminiService = require('../services/geminiService');
const groqService = require('../services/groqService');
const { protect } = require('../middleware/auth');

// Helper to get current week ID (e.g., "2024-W48")
const getWeekId = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDays = (now - startOfYear) / 86400000;
    const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNum}`;
};

// Helper to clean HTML entities and unwanted content from news text
const cleanText = (text) => {
    if (!text) return '';
    return text
        .replace(/&[a-z]+;/gi, '') // Remove HTML entities
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\{[^}]*\}/g, '') // Remove inline scripts
        .replace(/window\.open.*?;/g, '') // Remove window.open calls
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
};

// Get news (with category filtering)
router.get('/', async (req, res) => {
    try {
        const { category: filterCategory } = req.query;
        const weekId = getWeekId();

        // Fetch existing news for current week
        let query = { weekId };

        // "Money" categories that should be excluded from General news
        const moneyCategories = ['Crypto', 'Stocks', 'Commodities'];

        if (filterCategory === 'General') {
            query.category = { $in: ['Politics', 'Geopolitics', 'General'] };
            // Double-check to exclude money news even if miscategorized
            query.title = { $not: /bitcoin|crypto|stock market|nifty|sensex|commodity|gold price|silver price|crude oil/i };
        } else if (filterCategory && filterCategory !== 'All') {
            query.category = filterCategory;
        }

        let news = await News.find(query).sort({ createdAt: -1 });

        // Check if we need to fetch fresh news for the requested category or if all news is stale
        const categoryCount = await News.countDocuments(query);
        const globalCount = await News.countDocuments({ weekId });

        // Stale if no news at all, or no news for this category, or oldest news is > 3 days old
        const isStale = globalCount === 0 ||
            (filterCategory && categoryCount === 0) ||
            (news.length > 0 && new Date() - new Date(news[0].createdAt) > 3 * 24 * 60 * 60 * 1000);

        if (isStale) {
            console.log(`News for category "${filterCategory || 'All'}" is missing or stale. Fetching fresh news...`);
            try {
                const axios = require('axios');
                const NEWS_API_KEY = process.env.NEWS_API_KEY || '';

                if (!NEWS_API_KEY) {
                    console.warn('NEWS_API_KEY not found in environment');
                }

                // Negative filter for "General" news to avoid money topics
                const generalNegativeFilter = ' -crypto -bitcoin -ethereum -stocks -nifty -sensex -"stock market" -commodity -gold -silver -crude';

                const categoriesToFetch = [
                    { id: 'crypto', q: '(cryptocurrency OR bitcoin OR ethereum) AND India', cat: 'Crypto', useTop: false },
                    { id: 'stocks', q: '(NSE OR Nifty OR Sensex OR "Indian stock market")', cat: 'Stocks', useTop: false },
                    { id: 'politics', q: '("Modi" OR "Indian Government" OR "Supreme Court of India" OR "Indian Parliament")' + generalNegativeFilter, cat: 'Politics', useTop: true },
                    { id: 'geopolitics', q: '("India China" OR "India US" OR "G20" OR "United Nations India" OR "India Foreign Policy")' + generalNegativeFilter, cat: 'Geopolitics', useTop: true },
                    { id: 'commodities', q: '("Gold price India" OR "Silver price India" OR "Crude oil India")', cat: 'Commodities', useTop: false }
                ];

                const allArticles = [];
                const seenTitles = new Set();
                const seenUrls = new Set();

                if (filterCategory === 'General' || !filterCategory || filterCategory === 'All') {
                    try {
                        console.log('🤖 Generating fresh World Intelligence using Gemini (Simulation Context 2026)...');
                        const generatedNews = await geminiService.generateNewsAndPolls();

                        if (Array.isArray(generatedNews)) {
                            for (const item of generatedNews) {
                                allArticles.push({
                                    title: item.title,
                                    summary: item.summary,
                                    content: item.content,
                                    source: item.source || 'Global Intelligence',
                                    url: `https://google.com/search?q=${encodeURIComponent(item.title)}`, // Fallback URL
                                    imageUrl: null,
                                    publishedAt: new Date(),
                                    category: item.category || 'Geopolitics',
                                    sentiment: item.sentiment || 'neutral',
                                    poll: item.poll
                                });
                            }
                        }
                    } catch (err) {
                        console.error('Error generating news with Gemini:', err.message);
                    }
                } else {
                    // Existing logic for specific money categories if needed
                    for (const item of categoriesToFetch) {
                        const isRequested = filterCategory === item.cat;

                        if (!isRequested) continue;

                        try {
                            let response = await axios.get('https://newsapi.org/v2/everything', {
                                params: {
                                    q: item.q,
                                    language: 'en',
                                    sortBy: 'publishedAt',
                                    pageSize: 5,
                                    apiKey: NEWS_API_KEY
                                },
                                timeout: 7000
                            });

                            if (response.data && response.data.articles) {
                                const filteredArticles = response.data.articles.filter(a => !!a.urlToImage);
                                filteredArticles.slice(0, 5).forEach(article => {
                                    const cleanTitle = cleanText(article.title).substring(0, 200);
                                    if (!cleanTitle) return;

                                    allArticles.push({
                                        title: cleanTitle,
                                        summary: cleanText(article.description || ''),
                                        content: cleanText(article.content || ''),
                                        source: article.source?.name || 'News Source',
                                        url: article.url,
                                        imageUrl: article.urlToImage,
                                        publishedAt: article.publishedAt,
                                        category: item.cat,
                                        sentiment: 'neutral'
                                    });
                                });
                            }
                        } catch (err) {
                            console.error(`Error fetching ${item.id} news:`, err.message);
                        }
                    }
                }

                if (allArticles.length > 0) {
                    console.log(`Fetched ${allArticles.length} unique articles from API. Saving new ones...`);
                    let savedCount = 0;
                    for (const article of allArticles) {
                        // Simpler deduplication against database to avoid regex issues
                        const exists = await News.findOne({
                            $or: [
                                { url: article.url },
                                { title: article.title }
                            ]
                        });

                        if (exists) continue;

                        const savedNews = await new News({ ...article, weekId }).save();
                        savedCount++;

                        // Create polls
                        let pollQuestion = '';
                        let pollOptions = [];

                        if (article.category === 'Crypto') {
                            pollQuestion = 'How will this impact crypto prices?';
                            pollOptions = ['Major Rally', 'Neutral', 'Correction'];
                        } else if (article.category === 'Stocks') {
                            pollQuestion = 'Market outlook after this news?';
                            pollOptions = ['Bullish', 'Neutral', 'Bearish'];
                        } else if (article.category === 'Politics' || article.category === 'Geopolitics') {
                            pollQuestion = 'Impact on Indian society & economy?';
                            pollOptions = ['Positive', 'Neutral', 'Negative'];
                        } else {
                            pollQuestion = 'Your takeaway from this?';
                            pollOptions = ['Agree', 'Disagree', 'Neutral'];
                        }

                        await new Poll({
                            newsId: savedNews._id,
                            question: pollQuestion,
                            options: pollOptions.map(text => ({ text, votes: 0 }))
                        }).save();
                    }
                    console.log(`Successfully saved ${savedCount} new articles to database.`);
                } else {
                    console.log('No new articles found for the requested criteria.');
                }

                // Refresh the result after fetching
                news = await News.find(query).sort({ createdAt: -1 });
            } catch (err) {
                console.error('Failed fresh news fetch:', err.message);
            }
        }

        // Batch fetch polls
        const newsIds = news.map(n => n._id);
        const polls = await Poll.find({ newsId: { $in: newsIds } }).lean();
        const pollsByNewsId = polls.reduce((acc, p) => {
            acc[p.newsId.toString()] = p;
            return acc;
        }, {});

        const newsWithPolls = news.map(n => {
            const nObj = n.toObject();
            return { ...nObj, poll: pollsByNewsId[nObj._id.toString()] || null };
        });

        res.json(newsWithPolls);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Vote on a poll
router.post('/vote/:pollId', protect, async (req, res) => {
    try {
        const { optionIndex } = req.body;
        const userId = req.user.isGuest ? req.user.id : req.user._id.toString();

        const poll = await Poll.findById(req.params.pollId);
        if (!poll) return res.status(404).json({ message: 'Poll not found' });

        // Initialize voters if needed
        if (!poll.voters) poll.voters = [];

        // Check if user has already voted and where
        // Older records might be just strings, newer ones objects {userId, optionIndex}
        let previousVoteIndex = -1;
        let previousVoteEntry = -1;

        for (let i = 0; i < poll.voters.length; i++) {
            const v = poll.voters[i];
            if (typeof v === 'object' && v !== null) {
                if (String(v.userId) === String(userId)) {
                    previousVoteIndex = v.optionIndex;
                    previousVoteEntry = i;
                    break;
                }
            } else if (String(v) === String(userId)) {
                // If it's a legacy string-only entry, we don't know the index
                // We'll treat it as -1 and just remove it
                previousVoteIndex = -2; // Marker for "voted but index unknown"
                previousVoteEntry = i;
                break;
            }
        }

        if (previousVoteIndex === optionIndex) {
            // User voted for the same thing, just return
            return res.json(poll);
        }

        // Remove previous vote if exists
        if (previousVoteEntry !== -1) {
            if (previousVoteIndex >= 0 && poll.options[previousVoteIndex]) {
                poll.options[previousVoteIndex].votes = Math.max(0, poll.options[previousVoteIndex].votes - 1);
            }
            poll.voters.splice(previousVoteEntry, 1);
        }

        // Add new vote
        if (poll.options[optionIndex]) {
            poll.options[optionIndex].votes += 1;
            poll.voters.push({ userId, optionIndex });
            await poll.save();
        }

        res.json(poll);
    } catch (err) {
        console.error('Vote error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Get comments for a news item
router.get('/:newsId/comments', async (req, res) => {
    try {
        const comments = await Comment.find({ asset: String(req.params.newsId).toUpperCase() })
            .populate('user', 'firstName emailOrMobile isGuest')
            .populate('parentId') // Populate parent to check if it exists
            .sort({ createdAt: -1 });
        res.json(comments);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// Add comment to news
router.post('/:newsId/comments', protect, async (req, res) => {
    try {
        const { text, parentId } = req.body;
        const asset = String(req.params.newsId).toUpperCase();

        if (!text?.trim()) return res.status(400).json({ message: 'Comment text required' });

        // Validate parentId if provided
        if (parentId) {
            const parentComment = await Comment.findById(parentId);
            if (!parentComment || parentComment.asset !== asset) {
                return res.status(400).json({ message: 'Invalid parent comment' });
            }
        }

        const comment = new Comment({
            asset,
            user: req.user.isGuest ? {
                _id: req.user.id,
                id: req.user.id,
                firstName: req.user.firstName,
                emailOrMobile: req.user.emailOrMobile,
                isGuest: true
            } : req.user._id,
            text: text.trim(),
            category: 'news',
            parentId: parentId || null
        });

        await comment.save();

        // Populate user for immediate display if not guest
        if (!req.user.isGuest) {
            await comment.populate('user', 'firstName emailOrMobile isGuest');
        }

        res.json(comment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
