const groqService = require('./services/groqService');
require('dotenv').config();

async function test() {
    try {
        console.log("Testing Groq Service...");
        const news = await groqService.generateNewsAndPolls('Politics');
        console.log("Success!");
        console.log(JSON.stringify(news, null, 2));
    } catch (e) {
        console.error("Groq Failed:", e);
    }
}

test();
