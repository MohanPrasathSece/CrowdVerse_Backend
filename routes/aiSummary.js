const express = require('express');
const OpenAI = require('openai');
const router = express.Router();

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

router.post('/', async (req, res) => {
  const { asset_name, recent_comments = [], recent_news = [], market_sentiment = '' } = req.body || {};
  if (!openai) {
    return res.json({
      global_news_summary: 'OpenAI key not configured. Provide OPENAI_API_KEY to enable summaries.',
      user_comments_summary: '—',
      market_sentiment_summary: '—',
      final_summary: '—',
    });
  }

  try {
    const prompt = `You are a financial research assistant. Summarize the following information about ${asset_name} into four concise paragraphs separated by \n\n with headers: Global News Summary, Community Comments Summary, Market Sentiment Summary, Final Takeaway.\n\nRecent News Headlines:\n${recent_news.join('\n')}\n\nUser Comments:\n${recent_comments.join('\n')}\n\nMarket Sentiment Data:\n${market_sentiment}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0125',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const text = completion.choices?.[0]?.message?.content || '';
    const [g, c, m, f] = text.split(/\n\n/).map((s) => s.replace(/^.*?:\s*/i, ''));
    return res.json({
      global_news_summary: g || '',
      user_comments_summary: c || '',
      market_sentiment_summary: m || '',
      final_summary: f || '',
    });
  } catch (err) {
    console.error(err?.response?.data || err.message || err);
    return res.status(500).json({ message: 'Failed to generate AI summary' });
  }
});

module.exports = router;
