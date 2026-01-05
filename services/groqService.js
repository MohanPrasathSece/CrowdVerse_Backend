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

    async generateNewsAndPolls(category = 'General') {
        if (!this.groq) throw new Error('Groq not initialized');
        try {
            let topicPrompt = '';
            if (category === 'Crypto') topicPrompt = 'Cryptocurrency, Blockchain, Bitcoin, Ethereum, and DeFi market trends.';
            else if (category === 'Stocks') topicPrompt = 'Global and Indian Stock Markets, Nifty, Sensex, and corporate earnings.';
            else if (category === 'Commodities') topicPrompt = 'Gold, Silver, Crude Oil prices, and agricultural commodities.';
            else topicPrompt = 'Global Politics, Geopolitics, International Relations, and Indian National Policy.';

            const prompt = `
                You are a senior financial & political editor for a top-tier intelligence dashboard in the year 2026.
                Generate 5 high-impact, realistic news articles strictly focused on: ${topicPrompt}
                
                For each article, you MUST provide:
                1. "title": Catchy, professional headline.
                2. "summary": The COMPLETE, full news article (300-600 words). Do NOT truncate. Do NOT use "..." or "[+ chars]". This must be the entire story from beginning to end.
                3. "content": The same COMPLETE, full news article as above.
                4. "source": A credible fictional or real source name (e.g., "Groq Intel", "Reuters", "The Hindu", "CoinDesk").
                5. "category": "${category}".
                6. "sentiment": "bullish" | "bearish" | "neutral".
                7. "poll": A relevant engagement question with 3 options.

                Return the response in strictly valid JSON format with the following structure:
                {
                  "articles": [
                    {
                      "title": "...",
                      "summary": "...",
                      "content": "...",
                      "source": "...",
                      "category": "${category}",
                      "sentiment": "...",
                      "poll": {
                        "question": "...",
                        "options": ["...", "...", "..."]
                      }
                    }
                  ]
                }
            `;

            const completion = await this.groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.3-70b-versatile",
                response_format: { type: "json_object" },
                temperature: 0.7,
            });

            const content = completion.choices[0]?.message?.content;
            let data = JSON.parse(content);
            if (data.articles) return data.articles;
            // Fallback if AI returned just array or wrapped differently
            if (data.news) return data.news;
            if (Array.isArray(data)) return data;

            return [];
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
