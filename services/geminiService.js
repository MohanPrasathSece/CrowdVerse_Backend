const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = null;

    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      console.log('✅ Gemini AI service initialized');
    } else {
      console.warn('⚠️ GEMINI_API_KEY not found in environment variables');
    }
  }

  async generateIntelligenceAnalysis(assetData) {
    const startTime = Date.now();
    console.log(`🤖 [GEMINI] Starting intelligence analysis for ${assetData.assetSymbol}...`);
    console.log(`🤖 [GEMINI] Asset data:`, {
      symbol: assetData.assetSymbol,
      commentsCount: assetData.userComments?.length || 0,
      sentimentVotes: assetData.sentimentData?.totalSentimentVotes || 0,
      tradeVotes: assetData.marketData?.totalTradeVotes || 0
    });

    if (!this.genAI) {
      console.error(`❌ [GEMINI] Service not initialized for ${assetData.assetSymbol}`);
      throw new Error('Gemini AI service not initialized');
    }

    try {
      console.log(`🤖 [GEMINI] Initializing model for ${assetData.assetSymbol}...`);
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      console.log(`✅ [GEMINI] Model initialized successfully`);

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

      console.log(`🤖 [GEMINI] Generated prompt for ${assetData.assetSymbol} (length: ${prompt.length} chars)`);
      console.log(`🤖 [GEMINI] Sending request to Gemini API...`);

      const apiCallStart = Date.now();
      const apiResult = await model.generateContent(prompt);
      const apiCallDuration = Date.now() - apiCallStart;

      console.log(`✅ [GEMINI] API call completed for ${assetData.assetSymbol} in ${apiCallDuration}ms`);

      const response = await apiResult.response;
      const text = response.text();

      console.log(`🤖 [GEMINI] Received response for ${assetData.assetSymbol} (length: ${text.length} chars)`);
      console.log(`🤖 [GEMINI] Response preview:`, text.substring(0, 200) + (text.length > 200 ? '...' : ''));

      // Parse the response into sections
      console.log(`🤖 [GEMINI] Parsing response sections for ${assetData.assetSymbol}...`);
      const sections = this.parseResponse(text);

      console.log(`✅ [GEMINI] Parsed sections:`, Object.keys(sections).filter(key => sections[key]));

      const totalDuration = Date.now() - startTime;
      const result = {
        global_news_summary: sections.global_news_summary || 'No significant news detected.',
        user_comments_summary: sections.user_comments_summary || 'Limited community discussion.',
        market_sentiment_summary: sections.market_sentiment_summary || 'Insufficient sentiment data.',
        final_summary: sections.final_summary || 'Monitor price action and volume for signals.',
        generated_at: new Date().toISOString(),
        analysis_provider: 'gemini',
        asset_symbol: assetSymbol,
        asset_name: assetName,
        processing_time_ms: totalDuration,
        api_call_time_ms: apiCallDuration
      };

      console.log(`✅ [GEMINI] Successfully completed analysis for ${assetData.assetSymbol} in ${totalDuration}ms`);
      return result;

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      console.error(`❌ [GEMINI] Analysis failed for ${assetData.assetSymbol} after ${totalDuration}ms:`, {
        error: error.message,
        stack: error.stack,
        assetData: {
          symbol: assetData.assetSymbol,
          hasApiKey: !!this.apiKey,
          hasGenAI: !!this.genAI
        }
      });
      throw new Error(`Gemini analysis failed: ${error.message}`);
    }
  }

  parseResponse(text) {
    const sections = {
      global_news_summary: '',
      user_comments_summary: '',
      market_sentiment_summary: '',
      final_summary: ''
    };

    // Split by section headers (case insensitive, handle markdown formatting)
    const sectionRegex = /\*\*GLOBAL NEWS SUMMARY:\*\*|\*\*COMMUNITY COMMENTS SUMMARY:\*\*|\*\*MARKET SENTIMENT SUMMARY:\*\*|\*\*FINAL TAKEAWAY:\*\*|GLOBAL NEWS SUMMARY:|COMMUNITY COMMENTS SUMMARY:|MARKET SENTIMENT SUMMARY:|FINAL TAKEAWAY:/gi;
    const parts = text.split(sectionRegex);
    const headers = text.match(sectionRegex);

    console.log(`🤖 [GEMINI] Parsing found ${headers?.length || 0} headers and ${parts.length} parts`);

    // The first part contains any content before the first header
    let currentSection = '';
    let sectionIndex = 0;

    if (headers && parts.length > 1) {
      // Start from index 1 since index 0 is content before first header
      for (let i = 0; i < headers.length && i + 1 < parts.length; i++) {
        const header = headers[i];
        const content = parts[i + 1] || '';

        // Clean up content - remove extra newlines and markdown formatting
        let cleanContent = content.replace(/\n\n+/g, ' ').trim();
        // Remove markdown bold formatting from content
        cleanContent = cleanContent.replace(/\*\*/g, '');

        // Remove any bullet points and clean up
        cleanContent = cleanContent.replace(/^\*\s*/gm, '').replace(/^\d+\.\s*/gm, '');

        console.log(`🤖 [GEMINI] Processing section: ${header}`);

        if (header.toUpperCase().includes('GLOBAL NEWS')) {
          sections.global_news_summary = cleanContent;
        } else if (header.toUpperCase().includes('COMMUNITY COMMENTS')) {
          sections.user_comments_summary = cleanContent;
        } else if (header.toUpperCase().includes('MARKET SENTIMENT')) {
          sections.market_sentiment_summary = cleanContent;
        } else if (header.toUpperCase().includes('FINAL TAKEAWAY')) {
          sections.final_summary = cleanContent;
        }
      }
    } else {
      console.warn(`⚠️ [GEMINI] Could not parse sections properly. Headers found: ${headers?.length || 0}, Parts: ${parts.length}`);

      // Fallback: try to extract content using a different approach
      const lines = text.split('\n').filter(line => line.trim());
      let currentSection = '';
      let contentBuffer = [];

      for (const line of lines) {
        if (line.toUpperCase().includes('GLOBAL NEWS SUMMARY')) {
          if (currentSection === 'global_news' && contentBuffer.length > 0) {
            sections.global_news_summary = contentBuffer.join(' ').replace(/\*\*/g, '').trim();
          }
          currentSection = 'global_news';
          contentBuffer = [];
        } else if (line.toUpperCase().includes('COMMUNITY COMMENTS SUMMARY')) {
          if (currentSection === 'comments' && contentBuffer.length > 0) {
            sections.user_comments_summary = contentBuffer.join(' ').replace(/\*\*/g, '').trim();
          }
          currentSection = 'comments';
          contentBuffer = [];
        } else if (line.toUpperCase().includes('MARKET SENTIMENT SUMMARY')) {
          if (currentSection === 'sentiment' && contentBuffer.length > 0) {
            sections.market_sentiment_summary = contentBuffer.join(' ').replace(/\*\*/g, '').trim();
          }
          currentSection = 'sentiment';
          contentBuffer = [];
        } else if (line.toUpperCase().includes('FINAL TAKEAWAY')) {
          if (currentSection === 'final' && contentBuffer.length > 0) {
            sections.final_summary = contentBuffer.join(' ').replace(/\*\*/g, '').trim();
          }
          currentSection = 'final';
          contentBuffer = [];
        } else if (line.trim() && !line.startsWith('**') && !line.match(/^\d+\.\s*/)) {
          // This is content, add to buffer
          contentBuffer.push(line.trim());
        }
      }

      // Don't forget the last section
      if (currentSection === 'final' && contentBuffer.length > 0) {
        sections.final_summary = contentBuffer.join(' ').replace(/\*\*/g, '').trim();
      }
    }

    return sections;
  }

  async isAvailable() {
    return !!this.genAI;
  }

  async generateSummary(prompt) {
    if (!this.genAI) {
      console.error('❌ [GEMINI] Service not initialized for summary generation');
      throw new Error('Gemini AI service not initialized');
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.7,
        }
      });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        final_summary: text,
        success: true
      };
    } catch (error) {
      console.error('❌ [GEMINI] Error generating summary:', error);
      throw error;
    }
  }

  async generateNewsAndPolls() {
    if (!this.genAI) {
      throw new Error('Gemini AI service not initialized');
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.7,
        }
      });
      const prompt = `
        Generate 6 news items for this week related to Crypto, Stocks, and Politics that are STRICTLY focused on or significantly impact India, the Indian market (NSE/BSE), and Indian investors.
        Ensure information is relevant to an Indian audience.
        For each news item, also generate a relevant poll question with 3-4 options.
        
        Return the response in strictly valid JSON format with the following structure:
        [
          {
            "title": "News Title",
            "summary": "Short summary",
            "content": "Longer content...",
            "source": "Source Name (e.g., Economic Times, Moneycontrol, NDTV)",
            "category": "Crypto" | "Stocks" | "Politics",
            "sentiment": "bullish" | "bearish" | "neutral",
            "poll": {
              "question": "Poll Question?",
              "options": ["Option 1", "Option 2", "Option 3"]
            }
          }
        ]
        Do not include any markdown formatting (like \`\`\`json). Just the raw JSON string.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Clean up potential markdown code blocks
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      return JSON.parse(text);
    } catch (error) {
      console.error('❌ [GEMINI] Error generating news:', error);
      throw error;
    }
  }
}

module.exports = new GeminiService();
