const mongoose = require('mongoose');
require('dotenv').config();
const News = require('./models/News');

async function list() {
    await mongoose.connect(process.env.MONGODB_URI);
    const news = await News.find({ weekId: '2026-W2' }).sort({ createdAt: -1 });
    console.log(`Total for W2: ${news.length}`);
    news.forEach((n, i) => {
        console.log(`${i + 1}. [${n.category}] ${n.title}`);
    });
    process.exit();
}
list();
