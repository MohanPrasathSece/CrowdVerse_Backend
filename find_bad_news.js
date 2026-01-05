const mongoose = require('mongoose');
require('dotenv').config();
const News = require('./models/News');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const news = await News.find({ category: { $in: ['Politics', 'Geopolitics'] } }).sort({ createdAt: -1 }).limit(20);
    console.log(`Total checked: ${news.length}`);
    const badOnes = news.filter(n => n.content.includes('...') || n.content.includes('[+') || n.content.length < 501);
    console.log(`Bad ones: ${badOnes.length}`);
    badOnes.forEach(n => {
        console.log(`BAD ARTICLE: ${n.title} (Len: ${n.content.length}, Source: ${n.source})`);
    });

    // Check if any old articles are blocking the feed
    const oldOnes = news.filter(n => (new Date() - new Date(n.createdAt) > 12 * 3600 * 1000));
    console.log(`Old ones (>12h): ${oldOnes.length}`);

    process.exit();
}
check();
