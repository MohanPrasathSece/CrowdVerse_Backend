const express = require('express');
const router = express.Router();
const Poll = require('../models/Poll');
const Comment = require('../models/Comment');

// Initial seed data for predictions
const seedPredictions = async () => {
    const predictionData = [
        {
            question: "Will AI surpass human intelligence (AGI) be achieved by the end of 2026?",
            options: ["Yes", "No", "Maybe, but regulated heavily."],
            aiNewsSummary: "Global tech giants like OpenAI, Anthropic, and Google are accelerating compute clusters. Recent breakthroughs in reasoning models (o1-style) suggest a shorter timeline than previously anticipated by experts.",
            aiCommentsSummary: "Reddit's r/Singularity is highly bullish, while X (formerly Twitter) remains divided between safety researchers warning of doom and 'e/acc' proponents pushing for faster development.",
            aiSentimentSummary: "Exponential growth in LLM capabilities indicates a 40% probability of reaching human-level reasoning across most cognitive tasks by late 2026.",
            aiFinalSummary: "While technical hurdles remain in embodied AI and long-term memory, the consensus lean is 'Highly Likely' for narrow AGI, though public perception lags."
        },
        {
            question: "Will the US presidential election lead to a female president?",
            options: ["Yes", "No", "Too close to call."],
            aiNewsSummary: "The 2024 results have shifted the 2026-2028 landscape. Key figures in both parties are emerging as frontrunners, with gender becoming a secondary factor to economic policy in recent polling data.",
            aiCommentsSummary: "Political forums indicate a strong desire for 'new era' leadership. Significant discussion around Kamala Harris, Nikki Haley, and Michelle Obama continues to drive high engagement.",
            aiSentimentSummary: "Demographic shifts in swing states suggest that a moderate female candidate would perform 3-4% better than traditional male counterparts in suburban districts.",
            aiFinalSummary: "The probability is at an all-time high of 55%, but party unity and economic conditions in early 2026 will be the ultimate decider."
        },
        {
            question: "Will climate change cause a major city to become uninhabitable by 2026?",
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
            aiSentimentSummary: "Home advantage statistically yields a 15% boost in win probability for India. Current form of young superstars like Jaiswal and Gill is exceptionally high.",
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
            question: "Will cryptocurrency become the dominant global payment method by end of 2026?",
            options: ["Yes, mass adoption", "No, regulations kill it", "Hybrid system emerges."],
            aiNewsSummary: "Bitcoin ETFs have institutionalized the asset. CBDCs from major central banks are now entering pilot phases, bridging the gap between traditional fiat and blockchain tech.",
            aiCommentsSummary: "Crypto Twitter (CT) is predicting the 'hyperbitcoinization' of the global south, while r/Finance warns of massive volatility and lack of consumer protections slowing down retail.",
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
            question: "Will Article 370 be fully reinstated in Jammu & Kashmir by end of 2026?",
            options: ["Yes, Supreme Court twist", "No, Modi govt holds firm", "Partial changes, but status quo mostly."],
            aiNewsSummary: "The Supreme Court verdict upholding the abrogation has set a strong legal precedent. Current government policy is focused on statehood restoration after delimitation and elections.",
            aiCommentsSummary: "J&K subreddits are focused on the restoration of statehood and high-speed internet stability rather than the full return of 370, which many see as historically settled.",
            aiSentimentSummary: "Legal and political analysts see a 5% chance of reinstatement. The focus has shifted from 'Article 370' to 'Statehood' in 90% of political discourse.",
            aiFinalSummary: "Status quo holds firm. The political center of gravity has moved toward administrative integration and economic development."
        },
        {
            question: "Will Arvind Kejriwal’s AAP expand to win a state outside Delhi/Punjab in 2026?",
            options: ["Yes, Gujarat or Haryana breakthrough", "No, regional parties block ’em", "Minor gains, but no full win."],
            aiNewsSummary: "AAP is aggressively targeting Haryana and certain pockets of Gujarat. The 'Delhi Model' is being used as a template, but competing with established regional players remains difficult.",
            aiCommentsSummary: "Voters are discussing the 'Third Front' possibility. Discussion on AAP is high in middle-class urban circles, but rural penetration remains a challenge.",
            aiSentimentSummary: "Vote share projections show a consistent rise (2-4%) in target states, but translating that into seats against a unified opposition or a dominant BJP is the hurdle.",
            aiFinalSummary: "Minor gains are the most statistical outcome. A full state victory by 2026 is less likely than a 'kingmaker' role in a hung assembly."
        },
        {
            question: "Will the Indian economy surpass China’s growth rate in 2026?",
            options: ["Yes, reforms pay off", "No, global slowdown hits harder", "Neck-and-neck, debatable stats."],
            aiNewsSummary: "India is currently the fastest-growing major economy. Manufacturing shifts (China+1 strategy) are bringing massive FDI, while China's aging population and property sector woes create a drag.",
            aiCommentsSummary: "Economic subreddits are debating whether the 'per capita' gap is more important than the 'GDP growth' rate in measuring real-world impact for citizens.",
            aiSentimentSummary: "IMF and World Bank projects favor India for the 'Growth Rate' crown through 2027. The delta is expected to be around 1.5% in India's favor.",
            aiFinalSummary: "In terms of 'Rate (%)', India is almost certain to win. In terms of 'Absolute Wealth Added', China will likely still hold the lead due to its larger base."
        }
    ];

    try {
        const firstPoll = await Poll.findOne({ category: 'prediction', question: predictionData[0].question });
        const needsRefresh = !firstPoll || (await Poll.countDocuments({ category: 'prediction' })) < 10;

        if (needsRefresh) {
            console.log('Refreshing prediction polls with user-requested 10 items...');
            await Poll.deleteMany({ category: 'prediction' });

            for (const item of predictionData) {
                const poll = new Poll({
                    question: item.question,
                    category: 'prediction',
                    aiNewsSummary: item.aiNewsSummary,
                    aiCommentsSummary: item.aiCommentsSummary,
                    aiSentimentSummary: item.aiSentimentSummary,
                    aiFinalSummary: item.aiFinalSummary,
                    options: item.options.map(opt => ({
                        text: opt,
                        votes: Math.floor(Math.random() * 50) + 5
                    }))
                });
                const savedPoll = await poll.save();

                // Add sample comments
                const sampleComments = [
                    "Spot on analysis by the AI here.",
                    "I think the community sentiment is a bit too bullish.",
                    "Counting down the days to 2026!"
                ];

                for (const text of sampleComments) {
                    await Comment.create({
                        asset: savedPoll._id, // Use ID as string
                        text,
                        category: 'prediction',
                        user: '65a1234567890abcdef12345' // Handled as dummy or guest in logic usually
                    });
                }
            }
            console.log('Seed completed successfully for 10 items.');
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

// POST a vote to a prediction poll
router.post('/:id/vote', async (req, res) => {
    const { optionIndex } = req.body;
    const userId = req.user ? req.user._id : (req.headers['x-forwarded-for'] || req.socket.remoteAddress); // Fallback for guest voting

    try {
        const poll = await Poll.findById(req.params.id);
        if (!poll) return res.status(404).json({ message: 'Poll not found' });

        // Check if already voted (simplified logic for prediction polls)
        const travelerId = userId.toString();
        const alreadyVoted = poll.voters.find(v => v.userId === travelerId);

        if (alreadyVoted) {
            // Remove previous vote
            poll.options[alreadyVoted.optionIndex].votes -= 1;
            poll.voters = poll.voters.filter(v => v.userId !== travelerId);
        }

        // Add new vote
        poll.options[optionIndex].votes += 1;
        poll.voters.push({ userId: travelerId, optionIndex });

        await poll.save();
        res.json(poll);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
