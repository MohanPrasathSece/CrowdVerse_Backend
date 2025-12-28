const Groq = require('groq-sdk');

class GroqService {
    constructor() {
        this.apiKey = process.env.GROQ_API_KEY;
        this.groq = null;

        if (this.apiKey) {
            this.groq = new Groq({ apiKey: this.apiKey });
            console.log('✅ Groq AI service initialized');
        } else {
            console.warn('⚠️ GROQ_API_KEY not found in environment variables');
        }
    }

    async generateIntelligenceAnalysis(assetData) {
        const startTime = Date.now();
        console.log(`🤖 [GROQ] Starting intelligence analysis for ${assetData.assetSymbol}...`);

        if (!this.groq) {
            throw new Error('Groq AI service not initialized');
        }

        try {
            const { assetSymbol, assetName, recentNews, userComments, sentimentData, marketData } = assetData;

            const prompt = `You are a financial intelligence analyst. Analyze the following data for ${assetName} (${assetSymbol}) and provide insights in four specific sections:

GLOBAL NEWS SUMMARY: Analyze recent news headlines and their potential impact on the asset. Focus on market-moving events, regulatory changes, partnerships, or major announcements.

COMMUNITY COMMENTS SUMMARY: Summarize the sentiment and key themes from user discussions. Identify common concerns, bullish/bearish arguments, and community sentiment trends.

MARKET SENTIMENT SUMMARY: Analyze voting patterns, sentiment indicators, and market psychology. Provide insights into what the sentiment data suggests about market positioning.

FINAL TAKEAWAY: Provide actionable intelligence summary with key risks, opportunities, and what to monitor in the next 12 hours.

Data to analyze:
Recent News: ${recentNews || 'No recent news available'}
User Comments: ${userComments || 'No user comments available'}
Sentiment Data: ${JSON.stringify(sentimentData || {})}
Market Data: ${JSON.stringify(marketData || {})}

Keep each section concise but insightful. Focus on actionable intelligence rather than generic statements.`;

            const apiCallStart = Date.now();
            const completion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.5,
            });
            const apiCallDuration = Date.now() - apiCallStart;

            const text = completion.choices[0]?.message?.content || "";
            const sections = this.parseResponse(text);

            const totalDuration = Date.now() - startTime;
            return {
                global_news_summary: sections.global_news_summary || 'No significant news detected.',
                user_comments_summary: sections.user_comments_summary || 'Limited community discussion.',
                market_sentiment_summary: sections.market_sentiment_summary || 'Insufficient sentiment data.',
                final_summary: sections.final_summary || 'Monitor price action and volume for signals.',
                generated_at: new Date().toISOString(),
                analysis_provider: 'groq',
                asset_symbol: assetSymbol,
                asset_name: assetName,
                processing_time_ms: totalDuration,
                api_call_time_ms: apiCallDuration
            };

        } catch (error) {
            console.error(`❌ [GROQ] Analysis failed for ${assetData.assetSymbol}:`, error.message);
            throw error;
        }
    }

    async generateSummary(prompt) {
        if (!this.groq) {
            throw new Error('Groq AI service not initialized');
        }

        try {
            const completion = await this.groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.1-8b-instant",
                temperature: 0.5,
            });

            return {
                final_summary: completion.choices[0]?.message?.content || "",
                success: true
            };
        } catch (error) {
            console.error('❌ [GROQ] Error generating summary:', error);
            throw error;
        }
    }

    parseResponse(text) {
        const sections = {
            global_news_summary: '',
            user_comments_summary: '',
            market_sentiment_summary: '',
            final_summary: ''
        };

        const sectionRegex = /\*\*GLOBAL NEWS SUMMARY:\*\*|\*\*COMMUNITY COMMENTS SUMMARY:\*\*|\*\*MARKET SENTIMENT SUMMARY:\*\*|\*\*FINAL TAKEAWAY:\*\*|GLOBAL NEWS SUMMARY:|COMMUNITY COMMENTS SUMMARY:|MARKET SENTIMENT SUMMARY:|FINAL TAKEAWAY:/gi;
        const parts = text.split(sectionRegex);
        const headers = text.match(sectionRegex);

        if (headers && parts.length > 1) {
            for (let i = 0; i < headers.length && i + 1 < parts.length; i++) {
                const header = headers[i].toUpperCase();
                let content = parts[i + 1].trim();
                content = content.replace(/\*\*/g, '').replace(/^\*\s*/gm, '').replace(/^\d+\.\s*/gm, '').replace(/\n\n+/g, ' ').trim();

                if (header.includes('GLOBAL NEWS')) sections.global_news_summary = content;
                else if (header.includes('COMMUNITY COMMENTS')) sections.user_comments_summary = content;
                else if (header.includes('MARKET SENTIMENT')) sections.market_sentiment_summary = content;
                else if (header.includes('FINAL TAKEAWAY')) sections.final_summary = content;
            }
        }
        return sections;
    }

    async generateNewsAndPolls() {
        if (!this.groq) throw new Error('Groq not initialized');
        try {
            const prompt = `Generate 3 current market news items for Crypto, Stocks, and Politics that are STRICTLY related to or directly affect India/Indians. 
            Focus on Indian markets (NSE/BSE), Indian digital asset regulations, and Indian political/economic events.
            For each item, also generate a relevant poll question with 3 options.
            Return ONLY a valid JSON array of objects with this structure:
            [
              {
                "category": "Crypto",
                "title": "...",
                "summary": "...",
                "content": "...",
                "sentiment": "bullish|bearish|neutral",
                "source": "Groq Finance",
                "poll": {
                  "question": "...",
                  "options": ["...", "...", "..."]
                }
              }
            ]`;

            const completion = await this.groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.3-70b-versatile",
                response_format: { type: "json_object" },
                temperature: 0.7,
            });

            const content = completion.choices[0]?.message?.content;
            let data = JSON.parse(content);
            // Groq might return { "news": [...] } instead of just the array
            if (data.news) data = data.news;
            if (!Array.isArray(data)) data = [data];
            return data;
        } catch (error) {
            console.error('❌ [GROQ] News generation failed:', error);
            throw error;
        }
    }

    async isAvailable() {
        return !!this.groq;
    }
}

module.exports = new GroqService();
