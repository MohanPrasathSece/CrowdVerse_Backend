const geminiService = require('./services/geminiService');
require('dotenv').config();

async function test() {
    try {
        console.log("Testing Gemini Service...");
        const news = await geminiService.generateNewsAndPolls();
        console.log("Success!");
        console.log(JSON.stringify(news, null, 2));
    } catch (e) {
        console.error("Gemini Failed:", e);
        if (e.response) {
            console.error("Response data:", e.response.data);
        }
    }
}

test();
