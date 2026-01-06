const mongoose = require('mongoose');
const News = require('./models/News');
const Poll = require('./models/Poll');
const dotenv = require('dotenv');
dotenv.config();

async function cleanup() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // Find and delete truncated articles
        // This includes anything with ... or … or shorter than 500 chars (likely snippets)
        const truncatedQuery = {
            $or: [
                { content: /\.\.\.|…/ },
                { title: /\.\.\.|…/ },
                { content: { $regex: /^.{0,500}$/ } }
            ]
        };

        const toDelete = await News.find(truncatedQuery);
        const ids = toDelete.map(n => n._id);

        console.log(`Found ${ids.length} truncated articles to delete.`);

        if (ids.length > 0) {
            await Poll.deleteMany({ newsId: { $in: ids } });
            const result = await News.deleteMany({ _id: { $in: ids } });
            console.log(`Successfully deleted ${result.deletedCount} articles and their polls.`);
        }

        console.log('Cleanup complete.');
        process.exit(0);
    } catch (err) {
        console.error('Cleanup failed:', err);
        process.exit(1);
    }
}

cleanup();
