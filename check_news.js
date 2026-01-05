const mongoose = require('mongoose');
require('dotenv').config();
const News = require('./models/News');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const news = await News.find({ category: { $in: ['Politics', 'Geopolitics'] } }).sort({ createdAt: -1 }).limit(10);
    news.forEach(n => {
        console.log(`Title: ${n.title}`);
        console.log(`Length: ${n.content.length}`);
        console.log(`Truncated: ${n.content.includes('...') || n.content.includes('[+')}`);
        console.log(`Age (h): ${(new Date() - new Date(n.createdAt)) / (1000 * 3600)}`);
        console.log('---');
    });
    process.exit();
}
check();
