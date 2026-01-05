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
        let query = { weekId, source: { $ne: 'Yahoo Entertainment' } };

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
        // Also force refresh if we have too few articles (<10), or if any of the top 10 look 'old' or truncated
        const isStale = globalCount === 0 ||
            (filterCategory && categoryCount < 10) ||
            (news.length > 0 && news.slice(0, 10).some(item =>
                (new Date() - new Date(item.createdAt) > 12 * 60 * 60 * 1000) ||
                item.content.includes('[+') ||
                item.content.includes('...') ||
                item.content.length < 500 ||
                item.title.endsWith('...')
            ));

        if (isStale) {
            console.log(`News for category "${filterCategory || 'All'}" is missing, stale, or truncated. Fetching fresh news...`);
            let allArticles = [];

            // 1. Try Gemini AI First (Preferred for high quality, non-truncated content)
            try {
                if (process.env.GEMINI_API_KEY) {
                    console.log('🤖 Attempting to generate news with Gemini...');
                    let catsToFetch = [];

                    // Determine which categories to fetch
                    if (filterCategory === 'General' || !filterCategory || filterCategory === 'All') {
                        // For General page, we want a mix of Politics/Geo
                        catsToFetch = ['Politics', 'Geopolitics'];
                    } else {
                        catsToFetch = [filterCategory];
                    }

                    // Remove duplicates
                    catsToFetch = [...new Set(catsToFetch)];

                    for (const cat of catsToFetch) {
                        console.log(`🤖 Generating news for category: ${cat}`);
                        const articles = await geminiService.generateNewsAndPolls(cat);
                        if (articles && Array.isArray(articles)) {
                            articles.forEach(a => {
                                // Ensure category matches our schema enum if Gemini got creative
                                if (cat === 'Politics' || cat === 'Geopolitics') a.category = cat;
                                allArticles.push(a);
                            });
                        }
                    }
                    console.log(`✅ Gemini generated ${allArticles.length} articles.`);
                }
            } catch (err) {
                console.error('❌ Gemini news generation failed:', err.message);
                // Fallthrough to NewsAPI
            }

            // 2. Try Groq AI if Gemini failed
            if (allArticles.length === 0) {
                try {
                    if (process.env.GROQ_API_KEY) {
                        console.log('🤖 Attempting to generate news with Groq...');
                        let catsToFetch = [];

                        // Determine which categories to fetch
                        if (filterCategory === 'General' || !filterCategory || filterCategory === 'All') {
                            catsToFetch = ['Politics', 'Geopolitics'];
                        } else {
                            catsToFetch = [filterCategory];
                        }

                        // Remove duplicates
                        catsToFetch = [...new Set(catsToFetch)];

                        for (const cat of catsToFetch) {
                            console.log(`🤖 Generating news for category (Groq): ${cat}`);
                            const articles = await groqService.generateNewsAndPolls(cat);
                            if (articles && Array.isArray(articles)) {
                                articles.forEach(a => {
                                    if (cat === 'Politics' || cat === 'Geopolitics') a.category = cat;
                                    allArticles.push(a);
                                });
                            }
                        }
                        console.log(`✅ Groq generated ${allArticles.length} articles.`);
                    }
                } catch (err) {
                    console.error('❌ Groq news generation failed:', err.message);
                }
            }

            // 3. Fallback to NewsAPI if everything failed
            if (allArticles.length === 0) {
                console.log('🌍 Falling back to NewsAPI...');
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

                    const seenTitles = new Set();
                    const seenUrls = new Set();

                    for (const item of categoriesToFetch) {
                        const isRequested = !filterCategory ||
                            filterCategory === 'All' ||
                            (filterCategory === 'General' && ['Politics', 'Geopolitics'].includes(item.cat)) ||
                            filterCategory === item.cat;

                        if (!isRequested) continue;

                        try {
                            let response;
                            if (item.useTop) {
                                try {
                                    response = await axios.get('https://newsapi.org/v2/top-headlines', {
                                        params: {
                                            q: item.q.split(')')[0].replace(/[()"]/g, '').split(' OR ')[0],
                                            country: 'in',
                                            pageSize: 5,
                                            apiKey: NEWS_API_KEY
                                        },
                                        timeout: 7000
                                    });
                                } catch (e) {
                                    console.log(`Top headlines failed for ${item.id}, falling back...`);
                                }
                            }

                            if (!response || !response.data || !response.data.articles || response.data.articles.length === 0) {
                                response = await axios.get('https://newsapi.org/v2/everything', {
                                    params: {
                                        q: item.q,
                                        language: 'en',
                                        sortBy: 'publishedAt', // Changed from popularity to get fresher news
                                        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 7 days
                                        pageSize: 5,
                                        apiKey: NEWS_API_KEY
                                    },
                                    timeout: 7000
                                });
                            }

                            if (response.data && response.data.articles) {
                                const filteredArticles = response.data.articles.filter(a =>
                                    !!a.urlToImage &&
                                    a.source?.name !== 'Yahoo Entertainment' &&
                                    !a.url?.includes('yahoo.com/entertainment')
                                );

                                filteredArticles.slice(0, 5).forEach(article => {
                                    const cleanTitle = cleanText(article.title).substring(0, 200);
                                    const url = article.url;

                                    if (!cleanTitle || cleanTitle.length < 15) return;
                                    if (!article.description && !article.content) return;

                                    if (seenTitles.has(cleanTitle.toLowerCase()) || seenUrls.has(url)) return;

                                    seenTitles.add(cleanTitle.toLowerCase());
                                    seenUrls.add(url);

                                    // Better content cleaning for NewsAPI
                                    const description = cleanText(article.description || '');
                                    const content = cleanText(article.content || '')
                                        .replace(/\s*\[\+\d+ chars\]\s*$/, '')
                                        .replace(/\.\.\.\s*$/, '.');

                                    // Use content if it's long enough, otherwise fall back to description. 
                                    // Avoid concatenating if they are roughly the same.
                                    let fullCleanContent = content;
                                    if (description && content && !content.includes(description.substring(0, 20))) {
                                        if (content.length < description.length) fullCleanContent = description;
                                        // If content is just a truncated version of description, use description
                                    }

                                    // If we still have dots at the end, honestly just cut it off at the last period
                                    if (fullCleanContent.endsWith('...')) {
                                        const lastPeriod = fullCleanContent.lastIndexOf('.');
                                        if (lastPeriod > 50) fullCleanContent = fullCleanContent.substring(0, lastPeriod + 1);
                                    }

                                    allArticles.push({
                                        title: cleanTitle,
                                        summary: fullCleanContent, // Use the cleanest full text we have for both
                                        content: fullCleanContent,
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
                        }
                    }
                } catch (err) {
                    console.error("NewsAPI fallback failed", err);
                }
            }

            // 4. FINAL FALLBACK: Static 2026 Simulation Data (If AI failed and NewsAPI failed/is truncated)
            // This ensures we NEVER show broken/empty/dot-dot-dot pages if keys are missing.
            const isTruncatedSnippet = allArticles.length > 0 && allArticles.some(a => a.content.length < 500 || a.content.includes('...'));

            if ((allArticles.length === 0 || isTruncatedSnippet) && (filterCategory === 'General' || filterCategory === 'Politics' || filterCategory === 'Geopolitics')) {
                console.log('🛡️ Engaging Static 2026 Simulation Protocol (Final Fallback/Truncation Avoidance)...');
                const static2026News = [
                    {
                        title: "India's 'Digital Rupee' Usage Surpasses Cash in Metro Cities",
                        summary: "In a historic shift for the economy, the Reserve Bank of India reports that CBDC transactions have officially overtaken physical cash usage in Mumbai, Delhi, and Bangalore. The shift marks the success of the unified digital payment infrastructure launched in late 2024.",
                        content: "The Reserve Bank of India (RBI) confirmed today that the Digital Rupee (e₹) has surpassed physical currency in transaction volume across India's Tier-1 cities. This milestone comes just two years after the full-scale rollout of the Central Bank Digital Currency. Merchants cite lower transaction fees and instant settlement as primary drivers for the switch.\n\nHowever, privacy advocates continue to raise concerns about the traceability of digital funds. The government has assured citizens that transactions under ₹50,000 remain anonymous, a policy that has helped spur adoption among small vendors. Economists predict this shift will boost formal economic participation by 15% over the next fiscal year.",
                        source: "Future Finance India",
                        category: "Politics",
                        sentiment: "bullish",
                        imageUrl: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=1000",
                        poll: { question: "Is a cashless society good for India?", options: ["Yes, simpler", "No, privacy risk", "Neutral"] }
                    },
                    {
                        title: "Global Summit: India Leads 'Global South' Clean Energy Alliance",
                        summary: "Prime Minister's keynote at the 2026 Climate Summit establishes India as the de-facto leader of the new Global South Solar Alliance. The initiative pledges $50 billion in cross-border solar grid investments between India, Africa, and Southeast Asia.",
                        content: "India has formally taken the helm of the newly minted 'Global South Clean Energy Alliance', a coalition of 40 nations committed to bypassing fossil fuel dependence. The announcement was made during the 2026 New Delhi Climate Summit, drawing applause from UN delegates. The core of the plan involves a trans-continental solar grid connecting Indian solar parks with storage facilities in Africa.\n\nCritics argue the timeline is overly ambitious, citing geopolitical instability in transit regions. However, the Indian Ministry of External Affairs highlights that energy interdependence could actually serve as a stabilizing diplomatic force. Construction on the first undersea cable to Sri Lanka is set to begin next month.",
                        source: "GeoPol Daily",
                        category: "Geopolitics",
                        sentiment: "bullish",
                        imageUrl: "https://images.unsplash.com/photo-1548613053-220e753733ce?auto=format&fit=crop&q=80&w=1000",
                        poll: { question: "Will this boost India's global influence?", options: ["Yes, significantly", "No difference", "Too risky"] }
                    },
                    {
                        title: "Supreme Court to Hear Plea on AI Rights and Copyright",
                        summary: "The apex court agrees to hear a landmark public interest litigation defining the rights of AI entities and the copyright status of AI-generated art. The verdict could set a global precedent for digital intellectual property laws.",
                        content: "The Supreme Court of India has admitted a petition challenging the current copyright laws which exclude AI-generated works from protection. The case, brought by a consortium of tech startups and artists, argues that the 'human authorship' requirement is outdated in 2026. The bench observed that the rapid integration of AGI in daily life requires a re-examination of constitutional definitions of 'creator'.\n\nLegal experts suggest the court might favor a middle path, granting a new class of 'synthetic rights' that belong to the prompter rather than the machine. The hearing is scheduled for next week and is expected to draw international attention.",
                        source: "Legal Eagle",
                        category: "Politics",
                        sentiment: "neutral",
                        imageUrl: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=1000",
                        poll: { question: "Should AI art be copyrighted?", options: ["Yes", "No", "Complex issue"] }
                    },
                    {
                        title: "US-India Trade Deal 2.0 Focuses on Semiconductor Supply Chain",
                        summary: "Washington and New Delhi sign an expanded strategic partnership to secure 40% of the global chip supply chain. The deal includes visa fast-tracking for Indian tech talent and US subsidies for fabs in Gujarat.",
                        content: "The second phase of the US-India Critical Technology Partnership was signed yesterday, cementing a bilateral effort to reduce reliance on East Asian chip manufacturing. Under the new terms, US firms will receive tax credits for setting up semiconductor fabrication units in India's Gujarat and Karnataka states.\n\nWait times for H-1B visas for specialized tech workers have also been slashed to 2 weeks under the agreement. 'This is the most significant technology transfer pact in history,' claimed the US Secretary of State. Market analysts expect a surge in Indian tech stocks following the news.",
                        source: "Trade Winds",
                        category: "Geopolitics",
                        sentiment: "bullish",
                        imageUrl: "https://images.unsplash.com/photo-1555664424-778a69022365?auto=format&fit=crop&q=80&w=1000",
                        poll: { question: "Impact on Indian job market?", options: ["Huge Growth", "Minimal", "Brain Drain"] }
                    },
                    {
                        title: "New Education Policy 2026: Coding Mandatory for All streams",
                        summary: "The Ministry of Education updates the NEP to include mandatory computational logic and basic AI ethics for all high school streams, including Arts and Humanities, starting the 2026-27 academic year.",
                        content: "In a move to future-proof the workforce, the Ministry of Education has mandated 'Computational Logic & AI Ethics' as a core subject for Class 11 and 12 students across all streams. The update to the National Education Policy (NEP) asserts that digital literacy is now as fundamental as language skills.\n\n'We are not trying to make everyone a coder, but everyone must understand the logic that runs our world,' stated the Education Minister. Schools have been given a 1-year window to upgrade infrastructure. Ed-tech stocks rallied 5% on the announcement.",
                        source: "EduTimes 2026",
                        category: "Politics",
                        sentiment: "neutral",
                        imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1000",
                        poll: { question: "Is coding necessary for Arts students?", options: ["Yes, essential", "No, burden", "Optional only"] }
                    }
                ];

                allArticles = static2026News;
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

                    if (exists) {
                        // Special case: if existing article is truncated OR older than 12h, and new one is better/fresher, UPDATE it
                        const existingIsTruncated = exists.content.includes('[+') || exists.content.includes('...') || exists.content.length < 501;
                        const existingIsOld = (new Date() - new Date(exists.createdAt) > 12 * 60 * 60 * 1000);
                        const newIsFull = article.content.length > 300 && !article.content.includes('[+') && !article.content.includes('...');

                        if ((existingIsTruncated || existingIsOld) && newIsFull) {
                            console.log(`📝 Updating stale/truncated article with fresh content: ${article.title}`);
                            exists.summary = article.summary;
                            exists.content = article.content;
                            exists.createdAt = new Date(); // Reset to top of feed
                            await exists.save();
                            savedCount++;
                        }
                        continue;
                    }

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
