const express = require('express');
const router = express.Router();
const Poll = require('../models/Poll');
const Comment = require('../models/Comment');
const { protect } = require('../middleware/auth');

// Seed polls if they don't exist
const seedPolls = async () => {
    const questions = [
        "With the recent halving event and ETF approvals, do you believe Bitcoin has the momentum to break past the $100,000 milestone before the end of 2024?",
        "considering the rapid advancement of Generative AI, do you predict it will lead to significant mass unemployment across white-collar sectors by 2030?",
        "Given current progress by SpaceX and NASA, is it realistic to expect humans to successfully land on Mars before the year 2030?",
        "Do you foresee a major global stock market crash in 2024 due to geopolitical tensions and high interest rates?",
        "Will Electric Vehicles (EVs) surpass 50% of all new car sales globally by 2030, marking a definitive shift away from internal combustion engines?",
        "Will India become the world's third-largest economy by the end of 2027, surpassing Germany and Japan?",
        "Do you believe remote work will remain the standard for more than 70% of tech companies globally through 2026?",
        "Will nuclear fusion achieve commercially viable energy production status before 2035?",
        "Do you predict the S&P 500 will finish 2024 above the 5,500 mark?",
        "Will CBDCs (Central Bank Digital Currencies) replace physical cash in major economies by 2030?"
    ];

    try {
        const count = await Poll.countDocuments({ category: 'prediction' });
        if (count === 0) {
            console.log('Seeding prediction polls...');
            for (const q of questions) {
                const poll = new Poll({
                    question: q,
                    category: 'prediction',
                    options: [
                        { text: 'Yes', votes: 0 },
                        { text: 'No', votes: 0 },
                        { text: 'Uncertain', votes: 0 }
                    ]
                });
                await poll.save();
            }
        }
    } catch (err) {
        console.error('Error seeding polls:', err);
    }
};

// Run seed on load
seedPolls();

// Get all prediction polls
router.get('/', async (req, res) => {
    try {
        const polls = await Poll.find({ category: 'prediction' }).sort({ createdAt: -1 });
        res.json(polls);
    } catch (err) {
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
                previousVoteIndex = -2; // Legacy
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

// Get comments for a poll
router.get('/:pollId/comments', async (req, res) => {
    try {
        const comments = await Comment.find({ asset: String(req.params.pollId).toUpperCase() })
            .populate('user', 'firstName emailOrMobile isGuest')
            .populate('parentId')
            .sort({ createdAt: -1 });
        res.json(comments);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// Add comment to poll
router.post('/:pollId/comments', protect, async (req, res) => {
    try {
        const { text, parentId } = req.body;

        const comment = new Comment({
            asset: String(req.params.pollId).toUpperCase(),
            user: req.user._id,
            text,
            category: 'prediction',
            parentId: parentId || null
        });

        await comment.save();
        await comment.populate('user', 'firstName emailOrMobile isGuest');

        res.json(comment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
