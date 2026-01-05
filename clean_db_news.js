const mongoose = require('mongoose');
require('dotenv').config();
const News = require('./models/News');

async function clean() {
    await mongoose.connect(process.env.MONGODB_URI);
    // Delete articles that are truncated or too short
    const res = await News.deleteMany({
        $or: [
            { content: /\.\.\./ },
            { content: /\[\+/ },
            { $expr: { $lt: [{ $strLenCP: "$content" }, 501] } }
        ]
    });
    console.log(`Deleted ${res.deletedCount} bad articles.`);
    process.exit();
}
clean();
