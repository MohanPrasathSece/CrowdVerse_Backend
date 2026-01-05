const mongoose = require('mongoose');
require('dotenv').config();
const News = require('./models/News');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const all = await News.find({});
    console.log(`Grand Total: ${all.length}`);

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDays = (now - startOfYear) / 86400000;
    const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
    const weekId = `${now.getFullYear()}-W${weekNum}`;
    console.log(`Current WeekId: ${weekId}`);

    const currentWeekNews = await News.find({ weekId });
    console.log(`Current Week Total: ${currentWeekNews.length}`);

    const generalNews = await News.find({
        weekId,
        category: { $in: ['Politics', 'Geopolitics', 'General'] }
    });
    console.log(`General News Total: ${generalNews.length}`);

    generalNews.forEach(n => {
        console.log(`- [${n.category}] ${n.title}`);
    });

    process.exit();
}
check();
