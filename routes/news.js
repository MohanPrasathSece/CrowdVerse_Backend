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
        .replace(/\[.*?\]/g, '') // Remove square brackets content
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
};

// Get weekly news (auto-generate if missing)
router.get('/', async (req, res) => {
    try {
        const weekId = getWeekId();
        let news = await News.find({ weekId }).sort({ createdAt: -1 });

        if (news.length === 0) {
            console.log('Fetching news for week:', weekId);
            try {
                const axios = require('axios');
                const NEWS_API_KEY = process.env.NEWS_API_KEY || ''; // Get free key from newsapi.org

                // Fetch news from NewsAPI (free tier allows 100 requests/day)
                const categories = ['crypto', 'stocks', 'politics'];
                const allArticles = [];

                for (const category of categories) {
                    let query = '';
                    let newsCategory = '';

                    if (category === 'crypto') {
                        query = 'cryptocurrency OR bitcoin OR ethereum';
                        newsCategory = 'Crypto';
                    } else if (category === 'stocks') {
                        query = 'stock market OR nasdaq OR dow jones OR trading';
                        newsCategory = 'Stocks';
                    } else {
                        query = 'economy OR federal reserve OR inflation';
                        newsCategory = 'Politics';
                    }

                    try {
                        const response = await axios.get('https://newsapi.org/v2/everything', {
                            params: {
                                q: query,
                                language: 'en',
                                sortBy: 'publishedAt',
                                pageSize: 3,
                                apiKey: NEWS_API_KEY
                            }
                        });

                        if (response.data && response.data.articles) {
                            response.data.articles.forEach(article => {
                                const title = cleanText(article.title);
                                const desc = cleanText(article.description || '');
                                const cont = cleanText(article.content || '');

                                if (title && (desc || cont)) {
                                    allArticles.push({
                                        title: title.substring(0, 200),
                                        summary: (desc || cont).substring(0, 300),
                                        content: (cont || desc).substring(0, 1000),
                                        source: article.source?.name || 'News Source',
                                        url: article.url,
                                        imageUrl: article.urlToImage,
                                        publishedAt: article.publishedAt,
                                        category: newsCategory,
                                        sentiment: 'neutral'
                                    });
                                }
                            });
                        }
                    } catch (err) {
                        console.error(`Error fetching ${category} news:`, err.message);
                    }
                }

                // If NewsAPI fails or no key, use AI as fallback
                if (allArticles.length === 0) {
                    console.log('NewsAPI failed, using AI fallback');
                    try {
                        const groqAvailable = await groqService.isAvailable();
                        let generatedData;

                        if (groqAvailable) {
                            console.log('🤖 [NEWS] Generating with Groq...');
                            generatedData = await groqService.generateNewsAndPolls();
                        } else {
                            console.log('🤖 [NEWS] Generating with Gemini...');
                            generatedData = await geminiService.generateNewsAndPolls();
                        }

                        for (const item of generatedData) {
                            const newNews = new News({
                                title: item.title,
                                summary: item.summary,
                                content: item.content,
                                source: item.source || 'AI Summary',
                                category: item.category,
                                sentiment: item.sentiment,
                                weekId
                            });
                            const savedNews = await newNews.save();

                            if (item.poll) {
                                const newPoll = new Poll({
                                    newsId: savedNews._id,
                                    question: item.poll.question,
                                    options: item.poll.options.map(opt => ({ text: opt, votes: 0 }))
                                });
                                await newPoll.save();
                            }
                        }
                    } catch (geminiErr) {
                        console.error('Gemini also failed, using sample news:', geminiErr.message);
                        // Use sample news as last resort
                        const sampleNews = [
                            { title: 'Bitcoin Maintains Strength Above ₹50L Mark', summary: 'Bitcoin continues to show resilience as institutional adoption grows.', content: 'Major financial institutions are increasing their crypto allocations.', source: 'Crypto News', category: 'Crypto', sentiment: 'bullish' },
                            { title: 'Stock Markets Show Mixed Signals', summary: 'Major indices fluctuate as investors digest latest economic indicators.', content: 'Market participants are closely watching inflation data.', source: 'Market Watch', category: 'Stocks', sentiment: 'neutral' },
                            { title: 'Central Bank Policy Decisions Impact Markets', summary: 'Policy makers signal cautious approach to interest rates.', content: 'Economic outlook remains uncertain.', source: 'Economic Times', category: 'Politics', sentiment: 'neutral' }
                        ];

                        for (const article of sampleNews) {
                            const newNews = new News({ ...article, weekId });
                            const savedNews = await newNews.save();
                            const newPoll = new Poll({
                                newsId: savedNews._id,
                                question: `What's your outlook on this ${article.category} news?`,
                                options: [{ text: 'Very Bullish', votes: 0 }, { text: 'Bullish', votes: 0 }, { text: 'Neutral', votes: 0 }, { text: 'Bearish', votes: 0 }]
                            });
                            await newPoll.save();
                        }
                    }
                } else {
                    // Save fetched news and generate polls using Gemini
                    for (const article of allArticles.slice(0, 7)) {
                        const newNews = new News({
                            title: article.title,
                            summary: article.summary,
                            content: article.content,
                            source: article.source,
                            url: article.url,
                            imageUrl: article.imageUrl,
                            publishedAt: article.publishedAt,
                            category: article.category,
                            sentiment: article.sentiment,
                            weekId
                        });
                        const savedNews = await newNews.save();

                        // Create category-specific polls
                        let pollQuestion = '';
                        let pollOptions = [];

                        if (article.category === 'Crypto') {
                            const cryptoQuestions = [
                                { q: 'How will this impact crypto prices?', opts: ['Major Rally Expected', 'Moderate Increase', 'Sideways Movement', 'Potential Decline'] },
                                { q: 'What\'s your trading strategy?', opts: ['Buy the Dip', 'HODL Long-term', 'Take Profits', 'Wait and Watch'] },
                                { q: 'Market sentiment after this news?', opts: ['Very Bullish', 'Bullish', 'Neutral', 'Bearish'] }
                            ];
                            const selected = cryptoQuestions[Math.floor(Math.random() * cryptoQuestions.length)];
                            pollQuestion = selected.q;
                            pollOptions = selected.opts;
                        } else if (article.category === 'Stocks') {
                            const stockQuestions = [
                                { q: 'How will markets react?', opts: ['Strong Rally', 'Modest Gains', 'Range-bound', 'Correction Ahead'] },
                                { q: 'Best sector to invest?', opts: ['Tech Stocks', 'Banking', 'Pharma', 'Energy'] },
                                { q: 'Your market outlook?', opts: ['Very Bullish', 'Cautiously Optimistic', 'Neutral', 'Bearish'] }
                            ];
                            const selected = stockQuestions[Math.floor(Math.random() * stockQuestions.length)];
                            pollQuestion = selected.q;
                            pollOptions = selected.opts;
                        } else {
                            const politicsQuestions = [
                                { q: 'Impact on markets?', opts: ['Very Positive', 'Slightly Positive', 'Neutral', 'Negative'] },
                                { q: 'How to position portfolio?', opts: ['Increase Equity', 'Add Bonds', 'Hold Cash', 'Diversify'] },
                                { q: 'Economic outlook?', opts: ['Strong Growth', 'Moderate Growth', 'Stagnation', 'Recession Risk'] }
                            ];
                            const selected = politicsQuestions[Math.floor(Math.random() * politicsQuestions.length)];
                            pollQuestion = selected.q;
                            pollOptions = selected.opts;
                        }

                        const newPoll = new Poll({
                            newsId: savedNews._id,
                            question: pollQuestion,
                            options: pollOptions.map(opt => ({ text: opt, votes: 0 }))
                        });
                        await newPoll.save();
                    }
                }

                // Fetch again
                news = await News.find({ weekId }).sort({ createdAt: -1 });
            } catch (err) {
                console.error('Failed to fetch/generate news:', err);
                return res.status(500).json({ message: 'Failed to fetch news' });
            }
        }

        // Batch fetch polls for efficiency
        const newsIds = news.map(n => n._id);
        const polls = await Poll.find({ newsId: { $in: newsIds } }).lean();
        const pollsByNewsId = polls.reduce((acc, p) => {
            acc[p.newsId.toString()] = p;
            return acc;
        }, {});

        const newsWithPolls = news.map(n => {
            const nObj = n.toObject ? n.toObject() : n;
            return {
                ...nObj,
                poll: pollsByNewsId[nObj._id.toString()] || null
            };
        });

        res.json(newsWithPolls);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Vote on a poll
router.post('/vote/:pollId', async (req, res) => {
    try {
        const { optionIndex } = req.body;
        const poll = await Poll.findById(req.params.pollId);

        if (!poll) return res.status(404).json({ message: 'Poll not found' });

        // Simple vote increment (in real app, check if user already voted)
        if (poll.options[optionIndex]) {
            poll.options[optionIndex].votes += 1;
            await poll.save();
        }

        res.json(poll);
    } catch (err) {
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

        const comment = new Comment({
            asset: String(req.params.newsId).toUpperCase(), // Using newsId as asset identifier
            user: req.user._id,
            text,
            category: 'news',
            parentId: parentId || null
        });

        await comment.save();

        // Populate user for immediate display
        await comment.populate('user', 'firstName emailOrMobile isGuest');

        res.json(comment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
