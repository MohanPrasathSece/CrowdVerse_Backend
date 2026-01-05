const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function list() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // listModels is not a function on the model, it's a general method but might be version dependent
        // Actually, let's just try a simple generateContent with gemini-pro
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent("Hello");
        console.log("Gemini 1.5 Flash works!");
        console.log(result.response.text());
    } catch (e) {
        console.error("Gemini 1.5 Flash failed:", e.message);
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
            const result = await model.generateContent("Hello");
            console.log("Gemini Pro works!");
        } catch (e2) {
            console.error("Gemini Pro failed:", e2.message);
        }
    }
    process.exit();
}
list();
