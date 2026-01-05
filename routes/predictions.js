const express = require('express');
const router = express.Router();
const Poll = require('../models/Poll');
const Comment = require('../models/Comment');
const geminiService = require('../services/geminiService');

const { protect } = require('../middleware/auth');

// Initial seed data for predictions
const seedPredictions = async () => {
    const predictionData = [
        {
            question: "Will AI surpass human intelligence (AGI) be achieved by the end of 2026?",
            options: ["Yes", "No", "Maybe, but regulated heavily."],
            aiNewsSummary: "Global tech giants like OpenAI, Anthropic, and Google are accelerating compute clusters. Recent breakthroughs in reasoning models suggest a shorter timeline than previously anticipated by experts.",
            aiCommentsSummary: "Reddit's r/Singularity is highly bullish, while X remains divided between safety researchers warning of doom and e/acc proponents pushing for faster development.",
            aiSentimentSummary: "Exponential growth in LLM capabilities indicates a significant probability of reaching human-level reasoning across most cognitive tasks by late 2026.",
            aiFinalSummary: "While technical hurdles remain in embodied AI and long-term memory, the consensus lean is 'Highly Likely' for narrow AGI, though public perception lags."
        },
        {
            question: "Will Rahul Gandhi be the next PM?",
            options: ["Yes.", "No."],
            aiNewsSummary: "Recent election results and the Bharat Jodo Yatra have significantly altered Rahul Gandhi's public image. The INDIA alliance's performance in the 2024 elections has made the 2029 (or earlier) race highly competitive.",
            aiCommentsSummary: "Digital discourse is split between supporters who see a 'reborn' leader and skeptics who question the alliance's ability to remain united against the NDA's organizational strength.",
            aiSentimentSummary: "Sentiment polls show a rising favorability rating (approx +12% since 2023) in urban centers, though rural strongholds remain a battleground.",
            aiFinalSummary: "Numerical superiority in the Lok Sabha is the only metric that matters. While momentum is with the opposition, the incumbent's machinery remains a formidable hurdle."
        },
        {
            question: "Will USA control Venezuela Oil Reserves and impose Rothschild Banks?",
            options: ["Yes, USA is evil", "No, USA had noble intentions"],
            aiNewsSummary: "Geopolitical tensions in the region continue as energy security becomes a top priority for global powers. Sanctions and diplomatic maneuvers are frequently interpreted through the lens of resource control.",
            aiCommentsSummary: "Anti-imperialist circles and energy analysts frequently debate the true motives behind foreign intervention in South America, citing historical precedents in Iraq and Libya.",
            aiSentimentSummary: "Global sentiment index shows deep skepticism (70%+) regarding Western intervention in resource-rich nations, regardless of the stated humanitarian goals.",
            aiFinalSummary: "The collision of 'Economic Sovereignty' and 'Global Security' will likely result in continued sanctions rather than overt control by 2026."
        },
        {
            question: "Will climate change cause a major city to become uninhabitable due to rising seas or extreme weather in 2026?",
            options: ["Yes (e.g., Miami, Dhaka)", "No, we’ll adapt", "It’s already happening."],
            aiNewsSummary: "Rising sea levels are already impacting infrastructure in Jakarta and Miami. 2025 saw record-breaking temperatures that strained power grids and water supplies in major metropolitan hubs.",
            aiCommentsSummary: "Doomscrolling on climate forums is peaking, though architectural communities are highlighting innovative 'sponge city' designs as a way to defend against the inevitability.",
            aiSentimentSummary: "Data points toward a 'Slow Migration' rather than a sudden abandonment. Real estate prices in high-risk zones have started decoupling from market averages.",
            aiFinalSummary: "Total abandonment is unlikely by 2026, but 'Inhabitability' will be redefined by insurance costs and frequent utility failures."
        },
        {
            question: "Will India win the Cricket World Cup in 2026?",
            options: ["Yes, dominating", "No, rivals step up", "It’ll be a close final."],
            aiNewsSummary: "With the 2026 T20 World Cup being co-hosted by India and Sri Lanka, the Men in Blue have a massive home-ground advantage. The current squad depth is considered the best in a decade.",
            aiCommentsSummary: "Social media is buzzing with 'Bleed Blue' campaigns. However, fans are cautious about 'knockout curses' that have plagued the team in previous ICC events.",
            aiSentimentSummary: "Home advantage statistically yields a 15% boost in win probability for India. Current form of young superstars is exceptionally high.",
            aiFinalSummary: "India is the clear favorite (65% confidence), but the high-pressure environment of a home final remains the biggest mental hurdle."
        },
        {
            question: "Will Elon Musk’s SpaceX land humans on Mars in 2026?",
            options: ["Yes, mission success", "No, delays inevitable", "Partial success (e.g., orbit only)."],
            aiNewsSummary: "Starship reaches orbit consistently now. However, life support systems and the 'Starship HLS' for Artemis seem to be the priority for NASA, potentially pushing Mars to 2028.",
            aiCommentsSummary: "SpaceX fans are 'to the moon' (and Mars), while skeptics point to Elon's historically optimistic timelines. Discourses on Starbase progress suggest hardware is ready, but safety is not.",
            aiSentimentSummary: "Launch windows to Mars open every 26 months. 2026 is tight. Hardware progress is at 80%, but biological safety systems are lagging at 30%.",
            aiFinalSummary: "An uncrewed landing is 70% likely, but humans on the surface by 2026 remains a 15% long-shot. Partial success via orbit is the middle ground."
        },
        {
            question: "Will cryptocurrency become the dominant global payment method over fiat by end of 2026?",
            options: ["Yes, mass adoption", "No, regulations kill it", "Hybrid system emerges."],
            aiNewsSummary: "Bitcoin ETFs have institutionalized the asset. CBDCs from major central banks are now entering pilot phases, bridging the gap between traditional fiat and blockchain tech.",
            aiCommentsSummary: "Crypto Twitter is predicting the 'hyperbitcoinization' of the global south, while r/Finance warns of massive volatility and lack of consumer protections slowing down retail.",
            aiSentimentSummary: "Stablecoin volume has surpassed Visa's quarterly throughput in certain sectors. The trend is moving toward 'Invisible Crypto'—blockchain backends for bank apps.",
            aiFinalSummary: "A Hybrid System is the only realistic 2026 outcome. Fiat isn't dying yet, but it's increasingly living on-chain."
        },
        {
            question: "Will the BJP win a majority in the Uttar Pradesh assembly elections in 2027?",
            options: ["Yes, Yogi dominance", "No, SP-Congress alliance wins", "Hung assembly, coalitions rule."],
            aiNewsSummary: "The 'UP Model' of governance and infrastructure growth remains the central pillar of the campaign. Opposition alliances are showing unprecedented coordination, setting up a high-stakes battle.",
            aiCommentsSummary: "UP-specific forums are highly polarized. Ground reports suggest issues like unemployment are clashing with 'law and order' achievements in voter priorities.",
            aiSentimentSummary: "Recent local body polls show BJP retaining rural strongholds but facing stiff competition in urban centers from the SP-INC combine.",
            aiFinalSummary: "The edge remains with the incumbent (BJP) due to organizational strength, but the margin of victory is expected to narrow significantly compared to 2022."
        },
        {
            question: "Will Arvind Kejriwal’s AAP expand to win a state outside Delhi/Punjab in 2026?",
            options: ["Yes, Gujarat or Haryana breakthrough", "No, regional parties block ’em", "Minor gains, but no full win."],
            aiNewsSummary: "AAP is aggressively targeting Haryana and certain pockets of Gujarat. The 'Delhi Model' is being used as a template, but competing with established regional players remains difficult.",
            aiCommentsSummary: "Voters are discussing the 'Third Front' possibility. Discussion on AAP is high in middle-class urban circles, but rural penetration remains a challenge.",
            aiSentimentSummary: "Vote share projections show a consistent rise (2-4%) in target states, but translating that into seats against a unified opposition is the hurdle.",
            aiFinalSummary: "Minor gains are the most statistical outcome. A full state victory by 2026 is less likely than a 'kingmaker' role in a hung assembly."
        },
        {
            question: "Will the Indian economy surpass China’s growth rate in 2026 under current govt?",
            options: ["Yes, reforms pay off", "No, global slowdown hits harder", "Neck-and-neck, debatable stats."],
            aiNewsSummary: "India is currently the fastest-growing major economy. Manufacturing shifts (China+1 strategy) are bringing massive FDI, while China's aging population and property sector woes create a drag.",
            aiCommentsSummary: "Economic subreddits are debating whether the 'per capita' gap is more important than the 'GDP growth' rate in measuring real-world impact for citizens.",
            aiSentimentSummary: "IMF and World Bank projects favor India for the 'Growth Rate' crown through 2027. The delta is expected to be around 1.5% in India's favor.",
            aiFinalSummary: "In terms of 'Rate (%)', India is almost certain to win. In terms of 'Absolute Wealth Added', China will likely still hold the lead due to its larger base."
        },
        {
            question: "Does India need a GenZ protest like Nepal?",
            options: ["yes, soon in 2026", "yes, but not right now", "maybe, if the government doesn’t listen", "No, Modi government is perfect"],
            aiNewsSummary: "Political analysts draw parallels between the recent youth-led movements in neighbor nations and the rising digital activism in India. Unemployment and educational reforms remain the primary triggers for student mobilization.",
            aiCommentsSummary: "Social media is home to a growing 'youth-first' political discourse. While some call for structural disruption, others argue that existing democratic channels are sufficient for grievance redressal.",
            aiSentimentSummary: "Internal surveys suggest that 55% of GenZ respondents feel a disconnect from traditional political party machineries, favoring direct action logic.",
            aiFinalSummary: "A massive singular 'uprising' is less likely than localized, issue-based mobilizations (e.g., Agnipath, Farmers). The stability of the current administration remains the primary deterrent."
        }
    ];

    try {
        const lastQuestion = predictionData[predictionData.length - 1].question;
        const targetPoll = await Poll.findOne({ category: 'prediction', question: lastQuestion });
        const pollCount = await Poll.countDocuments({ category: 'prediction' });

        if (!targetPoll || pollCount !== predictionData.length) {
            console.log('🔄 Re-seeding individual prediction polls...');

            // Wipe generic comments only when re-seeding to ensure fresh discussion
            await Comment.deleteMany({
                category: 'prediction',
                text: { $in: ["Spot on analysis by the AI here.", "I think the community sentiment is a bit too bullish.", "Counting down the days to 2026!"] }
            });

            await Poll.deleteMany({ category: 'prediction' });

            for (const item of predictionData) {
                const poll = new Poll({
                    question: item.question,
                    category: 'prediction',
                    aiNewsSummary: item.aiNewsSummary,
                    aiCommentsSummary: item.aiCommentsSummary,
                    aiSentimentSummary: item.aiSentimentSummary,
                    aiFinalSummary: item.aiFinalSummary,
                    options: item.options.map(opt => ({ text: opt, votes: Math.floor(Math.random() * 50) + 5 }))
                });
                await poll.save();
            }
            console.log('✅ Individual prediction polls ready.');
        }
    } catch (err) {
        console.error('Seed error:', err);
    }
};

// GET all prediction polls
router.get('/', async (req, res) => {
    try {
        await seedPredictions();
        const polls = await Poll.find({ category: 'prediction' }).sort({ createdAt: -1 });
        res.json(polls);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET comments for a prediction poll
router.get('/:id/comments', async (req, res) => {
    try {
        const comments = await Comment.find({ asset: String(req.params.id) })
            .populate('user', 'firstName emailOrMobile isGuest')
            .populate('parentId')
            .sort({ createdAt: -1 });
        res.json(comments);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// Add comment to prediction
router.post('/:id/comments', protect, async (req, res) => {
    try {
        const { text, parentId } = req.body;
        const asset = String(req.params.id);

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
            category: 'prediction',
            parentId: parentId || null
        });

        await comment.save();

        if (!req.user.isGuest) {
            await comment.populate('user', 'firstName emailOrMobile isGuest');
        }

        res.json(comment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST a vote to a prediction poll
router.post('/:id/vote', async (req, res) => {
    const { optionIndex } = req.body;
    const userId = req.user ? req.user._id : (req.headers['x-forwarded-for'] || req.socket.remoteAddress);

    try {
        const poll = await Poll.findById(req.params.id);
        if (!poll) return res.status(404).json({ message: 'Poll not found' });

        const travelerId = userId.toString();
        const alreadyVoted = poll.voters.find(v => v.userId === travelerId);

        if (alreadyVoted) {
            poll.options[alreadyVoted.optionIndex].votes -= 1;
            poll.voters = poll.voters.filter(v => v.userId !== travelerId);
        }

        poll.options[optionIndex].votes += 1;
        poll.voters.push({ userId: travelerId, optionIndex });

        await poll.save();
        res.json(poll);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// POST to analyze prediction comments and update AI summary
router.post('/:id/analyze', async (req, res) => {
    try {
        const poll = await Poll.findById(req.params.id);
        if (!poll) return res.status(404).json({ message: 'Poll not found' });

        // Fetch recent comments for this prediction
        const comments = await Comment.find({ asset: String(poll._id) }).sort({ createdAt: -1 }).limit(20);
        const commentTexts = comments.map(c => c.text);

        // Prepare data for AI analysis
        const assetData = {
            assetSymbol: `PRE-${String(poll._id).slice(-6)}`,
            assetName: poll.question,
            recentNews: "",
            userComments: commentTexts.join('\n'),
            sentimentData: {
                totalVotes: poll.options.reduce((acc, opt) => acc + opt.votes, 0),
                breakdown: poll.options.map(opt => ({ text: opt.text, count: opt.votes }))
            }
        };

        console.log(`🤖 Analyzing prediction: ${poll.question}`);
        const analysis = await geminiService.generateIntelligenceAnalysis(assetData);

        // Update the poll with new AI insights
        poll.aiNewsSummary = analysis.global_news_summary;
        poll.aiCommentsSummary = analysis.user_comments_summary;
        poll.aiSentimentSummary = analysis.market_sentiment_summary;
        poll.aiFinalSummary = analysis.final_summary;

        await poll.save();
        res.json(poll);
    } catch (err) {
        console.error('AI Analysis failed:', err);
        res.status(500).json({ message: 'AI Analysis failed', error: err.message });
    }
});

module.exports = router;
