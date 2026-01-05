const mongoose = require('mongoose');
require('dotenv').config();
const News = require('./models/News');
const groqService = require('./services/groqService');
const { getWeekId } = require('./routes/news.js'); // Actually it's local in news.js, I'll redefine

function getWeekIdLocal() {
    const now = new Date();
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((now - oneJan) / (24 * 60 * 60 * 1000));
    const result = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);
    return `${now.getFullYear()}-W${result}`;
}

async function forceFetch() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Force fetching news with Groq...");
    const articles = await groqService.generateNewsAndPolls('Politics');
    const weekId = getWeekIdLocal();

    let saved = 0;
    for (const art of articles.articles) {
        const exists = await News.findOne({ title: art.title });
        if (!exists) {
            await new News({ ...art, weekId }).save();
            saved++;
        }
    }
    console.log(`Saved ${saved} new articles.`);
    process.exit();
}
forceFetch();
