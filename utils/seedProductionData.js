const mongoose = require('mongoose');
const Intelligence = require('../models/Intelligence');
const { cryptoAssets, stockAssets } = require('../constants/marketAssets');

// Production intelligence data (relatable and realistic)
const productionIntelligenceData = {
  // Crypto assets
  'BINANCE:BTCUSDT': {
    global_news_summary: "Bitcoin shows strong institutional adoption with major corporations adding BTC to treasury reserves. Market sentiment remains bullish as regulatory clarity improves globally.",
    user_comments_summary: "Community sentiment is overwhelmingly positive with discussions focusing on Bitcoin's role as digital gold and inflation hedge.",
    market_sentiment_summary: "Technical indicators suggest accumulation phase with strong support at key levels. On-chain metrics show healthy network activity.",
    final_summary: "Bitcoin demonstrates resilience as a store of value asset with growing mainstream acceptance and improving market infrastructure.",
    data_points: [
      { type: 'adoption', value: '85%', label: 'Institutional Adoption' },
      { type: 'sentiment', value: '78', label: 'Community Sentiment' },
      { type: 'technical', value: 'Bullish', label: 'Technical Signal' },
      { type: 'network', value: 'High', label: 'Network Activity' }
    ]
  },
  'BINANCE:ETHUSDT': {
    global_news_summary: "Ethereum continues to dominate DeFi ecosystem with significant upgrades improving scalability and reducing gas fees. Layer 2 solutions show massive growth.",
    user_comments_summary: "Developers and investors express optimism about Ethereum's roadmap and its position as the leading smart contract platform.",
    market_sentiment_summary: "Staking metrics reach all-time highs with ETH 2.0 adoption accelerating. Network fundamentals remain strong despite market volatility.",
    final_summary: "Ethereum maintains its leadership in blockchain innovation with robust ecosystem growth and continuous technological improvements.",
    data_points: [
      { type: 'defi', value: '65%', label: 'DeFi Dominance' },
      { type: 'staking', value: '72%', label: 'ETH Staked' },
      { type: 'development', value: 'Very High', label: 'Developer Activity' },
      { type: 'scalability', value: 'Improving', label: 'Scalability Status' }
    ]
  },
  'BINANCE:SOLUSDT': {
    global_news_summary: "Solana gains significant traction in NFT and gaming sectors with high throughput capabilities attracting developers and projects.",
    user_comments_summary: "Community highlights Solana's speed and low costs, though some express concerns about network stability during peak periods.",
    market_sentiment_summary: "Technical analysis shows strong momentum with increasing institutional interest in Solana's ecosystem projects.",
    final_summary: "Solana emerges as a strong competitor to established chains with impressive performance metrics and growing ecosystem.",
    data_points: [
      { type: 'performance', value: '65,000 TPS', label: 'Transaction Speed' },
      { type: 'cost', value: '$0.00025', label: 'Avg Transaction Cost' },
      { type: 'nft', value: 'Growing', label: 'NFT Sector Growth' },
      { type: 'stability', value: 'Improving', label: 'Network Stability' }
    ]
  },
  'BINANCE:DOGEUSDT': {
    global_news_summary: "Dogecoin maintains strong community support with celebrity endorsements and social media presence driving retail interest.",
    user_comments_summary: "The Dogecoin community remains highly active and engaged, consistently promoting adoption and use cases for payments.",
    market_sentiment_summary: "While technically simple, Dogecoin benefits from massive brand recognition and loyal following across social platforms.",
    final_summary: "Dogecoin continues to serve as a gateway cryptocurrency for newcomers with strong community-driven development.",
    data_points: [
      { type: 'community', value: 'Very Strong', label: 'Community Support' },
      { type: 'social', value: 'High', label: 'Social Media Presence' },
      { type: 'adoption', value: 'Growing', label: 'Payment Adoption' },
      { type: 'recognition', value: 'Excellent', label: 'Brand Recognition' }
    ]
  },
  'BINANCE:ADAUSDT': {
    global_news_summary: "Cardano focuses on academic approach to blockchain development with peer-reviewed research driving protocol improvements.",
    user_comments_summary: "Community appreciates Cardano's methodical development approach and emphasis on sustainability and interoperability.",
    market_sentiment_summary: "Smart contract capabilities continue to expand with growing DeFi ecosystem building on Cardano's secure infrastructure.",
    final_summary: "Cardano maintains its position as a research-driven blockchain platform with steady ecosystem growth.",
    data_points: [
      { type: 'research', value: 'Academic', label: 'Development Approach' },
      { type: 'defi', value: 'Expanding', label: 'DeFi Ecosystem' },
      { type: 'sustainability', value: 'High', label: 'Sustainability Focus' },
      { type: 'security', value: 'Very High', label: 'Security Rating' }
    ]
  },
  'BINANCE:XRPUSDT': {
    global_news_summary: "Ripple's XRP focuses on cross-border payment solutions with partnerships in the financial sector despite regulatory challenges.",
    user_comments_summary: "Community remains optimistic about XRP's use case in international payments and remittances.",
    market_sentiment_summary: "Technical analysis shows consolidation phase with potential breakout pending regulatory clarity.",
    final_summary: "XRP continues to develop its payment infrastructure while navigating regulatory landscape.",
    data_points: [
      { type: 'payments', value: 'Cross-border', label: 'Primary Use Case' },
      { type: 'partnerships', value: 'Growing', label: 'Financial Partnerships' },
      { type: 'regulatory', value: 'Pending', label: 'Regulatory Status' },
      { type: 'adoption', value: 'Moderate', label: 'Institutional Use' }
    ]
  },
  'BINANCE:DOTUSDT': {
    global_news_summary: "Polkadot focuses on interoperability between blockchains with parachain ecosystem expanding rapidly.",
    user_comments_summary: "Developers praise Polkadot's technical architecture and ability to connect different blockchain networks.",
    market_sentiment_summary: "Parachain auctions and ecosystem projects drive network activity and token utility.",
    final_summary: "Polkadot establishes itself as a key player in blockchain interoperability with robust technology.",
    data_points: [
      { type: 'interoperability', value: 'Core Focus', label: 'Primary Feature' },
      { type: 'parachains', value: 'Growing', label: 'Parachain Ecosystem' },
      { type: 'technology', value: 'Advanced', label: 'Technical Architecture' },
      { type: 'governance', value: 'Active', label: 'Governance Activity' }
    ]
  },
  'BINANCE:AVAXUSDT': {
    global_news_summary: "Avalanche gains attention in gaming and DeFi sectors with sub-second finality and low transaction costs.",
    user_comments_summary: "Community highlights Avalanche's performance and growing ecosystem of dApps and protocols.",
    market_sentiment_summary: "Network metrics show strong growth with increasing TVL and active addresses on the platform.",
    final_summary: "Avalanche positions itself as a high-performance blockchain platform with expanding ecosystem.",
    data_points: [
      { type: 'performance', value: 'Sub-second', label: 'Transaction Finality' },
      { type: 'cost', value: 'Low', label: 'Transaction Costs' },
      { type: 'gaming', value: 'Strong', label: 'Gaming Sector' },
      { type: 'defi', value: 'Growing', label: 'DeFi TVL' }
    ]
  },
  'BINANCE:LINKUSDT': {
    global_news_summary: "Chainlink maintains dominance as the leading oracle network with integrations across major blockchain platforms.",
    user_comments_summary: "Community recognizes Chainlink's essential role in connecting smart contracts to real-world data.",
    market_sentiment_summary: "Oracle services show consistent growth with increasing demand from DeFi and traditional finance.",
    final_summary: "Chainlink solidifies its position as critical infrastructure for the blockchain ecosystem.",
    data_points: [
      { type: 'oracle', value: 'Market Leader', label: 'Oracle Services' },
      { type: 'integrations', value: 'Extensive', label: 'Platform Integrations' },
      { type: 'demand', value: 'High', label: 'Service Demand' },
      { type: 'reliability', value: 'Excellent', label: 'Network Reliability' }
    ]
  },
  'BINANCE:MATICUSDT': {
    global_news_summary: "Polygon focuses on Ethereum scaling solutions with significant adoption in DeFi and NFT sectors.",
    user_comments_summary: "Community appreciates Polygon's role in reducing Ethereum gas fees and improving user experience.",
    market_sentiment_summary: "Network activity remains high with growing number of dApps choosing Polygon for deployment.",
    final_summary: "Polygon establishes itself as a leading layer 2 solution for Ethereum with strong ecosystem growth.",
    data_points: [
      { type: 'scaling', value: 'Layer 2', label: 'Scaling Solution' },
      { type: 'adoption', value: 'High', label: 'dApp Adoption' },
      { type: 'cost', value: '95% Lower', label: 'Gas Cost Reduction' },
      { type: 'compatibility', value: 'Full', label: 'EVM Compatibility' }
    ]
  },
  // Stock assets
  'RELIANCE': {
    global_news_summary: "Reliance Industries continues to expand its digital and retail footprint while maintaining strong performance in core energy business.",
    user_comments_summary: "Investors show confidence in Reliance's diversification strategy and digital transformation initiatives.",
    market_sentiment_summary: "Technical analysis indicates strong institutional support with consistent buying at key levels.",
    final_summary: "Reliance demonstrates robust business resilience with strategic investments in future growth sectors.",
    data_points: [
      { type: 'digital', value: 'Expanding', label: 'Digital Business' },
      { type: 'retail', value: 'Growing', label: 'Retail Network' },
      { type: 'energy', value: 'Stable', label: 'Energy Segment' },
      { type: 'diversification', value: 'Strong', label: 'Business Diversification' }
    ]
  },
  'TCS': {
    global_news_summary: "Tata Consultancy Services maintains leadership in IT services with strong growth in digital transformation and cloud services.",
    user_comments_summary: "Analysts remain bullish on TCS's ability to capture market share in enterprise digitalization.",
    market_sentiment_summary: "Company shows consistent financial performance with healthy deal pipeline and client retention.",
    final_summary: "TCS continues to strengthen its market position through innovation and client-centric approach.",
    data_points: [
      { type: 'digital', value: 'Market Leader', label: 'Digital Services' },
      { type: 'cloud', value: 'Strong Growth', label: 'Cloud Services' },
      { type: 'clients', value: 'High Retention', label: 'Client Relationships' },
      { type: 'innovation', value: 'Consistent', label: 'R&D Investment' }
    ]
  },
  'HDFCBANK': {
    global_news_summary: "HDFC Bank maintains strong asset quality and continues to expand its digital banking capabilities across urban and rural markets.",
    user_comments_summary: "Investors appreciate bank's conservative risk management and consistent dividend policy.",
    market_sentiment_summary: "Bank shows healthy loan growth with improving net interest margins and low credit costs.",
    final_summary: "HDFC Bank demonstrates resilience in challenging environment with strong fundamentals.",
    data_points: [
      { type: 'digital', value: 'Expanding', label: 'Digital Banking' },
      { type: 'quality', value: 'Excellent', label: 'Asset Quality' },
      { type: 'growth', value: 'Healthy', label: 'Loan Growth' },
      { type: 'reach', value: 'Pan-India', label: 'Market Presence' }
    ]
  },
  'INFY': {
    global_news_summary: "Infosys shows strong recovery in deal signings with focus on AI and cloud-based services driving future growth.",
    user_comments_summary: "Market participants are optimistic about Infosys's strategic partnerships and digital capabilities.",
    market_sentiment_summary: "Company demonstrates improving operating margins with successful cost optimization initiatives.",
    final_summary: "Infosys positions itself well for the next wave of digital transformation with strong execution capabilities.",
    data_points: [
      { type: 'ai', value: 'Focus Area', label: 'AI Services' },
      { type: 'cloud', value: 'Strong', label: 'Cloud Business' },
      { type: 'deals', value: 'Recovering', label: 'Deal Pipeline' },
      { type: 'execution', value: 'Strong', label: 'Delivery Excellence' }
    ]
  },
  'ICICIBANK': {
    global_news_summary: "ICICI Bank shows strong performance in retail and corporate segments with significant digital banking adoption.",
    user_comments_summary: "Investors recognize bank's improved asset quality and focus on technology-driven services.",
    market_sentiment_summary: "Bank demonstrates healthy credit growth with improving profitability metrics.",
    final_summary: "ICICI Bank continues its transformation journey with strong digital initiatives and risk management.",
    data_points: [
      { type: 'retail', value: 'Strong', label: 'Retail Banking' },
      { type: 'digital', value: 'High Adoption', label: 'Digital Services' },
      { type: 'corporate', value: 'Growing', label: 'Corporate Banking' },
      { type: 'technology', value: 'Advanced', label: 'Tech Infrastructure' }
    ]
  },
  'SBIN': {
    global_news_summary: "State Bank of India shows improvement in asset quality and continues to support economic growth through credit expansion.",
    user_comments_summary: "Government support and economic recovery drive positive sentiment for India's largest bank.",
    market_sentiment_summary: "Bank benefits from improving economic conditions and digital transformation initiatives.",
    final_summary: "SBI plays crucial role in India's economic development with improving operational metrics.",
    data_points: [
      { type: 'size', value: 'Largest', label: 'Market Position' },
      { type: 'support', value: 'Government', label: 'Strategic Importance' },
      { type: 'digital', value: 'Transforming', label: 'Digital Initiatives' },
      { type: 'reach', value: 'Extensive', label: 'Branch Network' }
    ]
  },
  'LT': {
    global_news_summary: "Larsen & Toubro benefits from infrastructure push with strong order book and diversification into technology services.",
    user_comments_summary: "Investors are optimistic about infrastructure spending and L&T's execution capabilities.",
    market_sentiment_summary: "Company shows robust order inflow with improving margins and international business growth.",
    final_summary: "L&T is well-positioned to capitalize on infrastructure development with strong execution track record.",
    data_points: [
      { type: 'infrastructure', value: 'Key Beneficiary', label: 'Infrastructure Spending' },
      { type: 'orders', value: 'Strong', label: 'Order Book' },
      { type: 'execution', value: 'Proven', label: 'Track Record' },
      { type: 'international', value: 'Growing', label: 'Global Business' }
    ]
  }
};

async function seedProductionIntelligenceData() {
  try {
    console.log('🔍 Checking if intelligence data needs seeding...');
    
    // Check if data already exists
    const existingCount = await Intelligence.countDocuments();
    if (existingCount > 0) {
      console.log(`✅ Intelligence data already exists (${existingCount} records). Skipping seeding.`);
      return;
    }
    
    console.log('🌱 Starting production intelligence data seeding...');
    
    const allAssets = [...cryptoAssets, ...stockAssets];
    let seededCount = 0;
    
    for (const asset of allAssets) {
      const symbol = asset.symbol;
      const dummyData = productionIntelligenceData[symbol];
      
      if (dummyData) {
        const intelligenceRecord = new Intelligence({
          asset: symbol,
          assetType: cryptoAssets.some(c => c.symbol === symbol) ? 'crypto' : 'stock',
          global_news_summary: dummyData.global_news_summary,
          user_comments_summary: dummyData.user_comments_summary,
          market_sentiment_summary: dummyData.market_sentiment_summary,
          final_summary: dummyData.final_summary,
          data_points: dummyData.data_points,
          analysis_provider: 'AI Analysis Engine',
          generated_at: new Date(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });
        
        await intelligenceRecord.save();
        console.log(`✅ Seeded intelligence data for ${symbol}`);
        seededCount++;
      } else {
        // Generate generic data for any missing assets
        const intelligenceRecord = new Intelligence({
          asset: symbol,
          assetType: cryptoAssets.some(c => c.symbol === symbol) ? 'crypto' : 'stock',
          global_news_summary: `Market analysis for ${asset.name} shows stable performance with positive long-term outlook.`,
          user_comments_summary: `Community sentiment for ${asset.name} remains cautiously optimistic with steady interest.`,
          market_sentiment_summary: `Technical indicators suggest consolidation phase with potential for upward movement.`,
          final_summary: `${asset.name} demonstrates solid fundamentals with reasonable risk-reward profile.`,
          data_points: [
            { type: 'sentiment', value: 'Neutral', label: 'Market Sentiment' },
            { type: 'technical', value: 'Stable', label: 'Technical Status' },
            { type: 'volume', value: 'Moderate', label: 'Trading Volume' },
            { type: 'outlook', value: 'Positive', label: 'Future Outlook' }
          ],
          analysis_provider: 'AI Analysis Engine',
          generated_at: new Date(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
        
        await intelligenceRecord.save();
        console.log(`⚪ Generated generic intelligence data for ${symbol}`);
        seededCount++;
      }
    }
    
    console.log(`\n🎉 Production intelligence data seeding complete! Seeded ${seededCount} assets.`);
    
  } catch (error) {
    console.error('❌ Error seeding production intelligence data:', error);
    throw error;
  }
}

module.exports = { seedProductionIntelligenceData };
