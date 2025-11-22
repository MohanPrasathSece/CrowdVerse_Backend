const mongoose = require('mongoose');
const Intelligence = require('./models/Intelligence');
const Comment = require('./models/Comment');
const SentimentVote = require('./models/SentimentVote');
const TradeIntentVote = require('./models/TradeIntentVote');
const User = require('./models/User');
require('dotenv').config();

const comprehensiveIntelligenceData = {
  // Cryptocurrencies
  'BTC': {
    global_news_summary: "Bitcoin maintains dominance above $67,000 as institutional adoption accelerates. Major financial institutions including BlackRock and Fidelity continue to accumulate BTC holdings. ETF inflows show sustained institutional demand. Regulatory clarity improves with favorable legislative developments in key markets. Mining operations show increasing efficiency with renewable energy adoption. Lightning Network capacity grows significantly, enhancing scalability solutions.",
    user_comments_summary: "Community shows strong engagement with 1,250+ comments discussing Bitcoin's price action and institutional adoption. Technical analysis discussions focus on key resistance levels at $70,000 and support at $65,000. Long-term holders express confidence in BTC's store of value proposition. Trading community debates potential impact of upcoming halving cycle. Retail sentiment remains bullish with increased wallet activity observed.",
    market_sentiment_summary: "Market sentiment for Bitcoin shows 78.5% bullish vs 21.5% bearish based on 450+ community votes. Technical indicators suggest strong uptrend momentum with RSI at 68. Volume analysis confirms institutional accumulation patterns. Options market data shows increased call option activity. On-chain metrics reveal decreasing exchange reserves and growing long-term holder confidence.",
    final_summary: "Bitcoin demonstrates strong fundamental and technical strength with institutional backing driving price appreciation. Risk factors include regulatory uncertainty and potential market corrections. Long-term outlook remains positive with ETF flows providing sustained demand. Key levels to watch: $70,000 resistance and $65,000 support. Consider dollar-cost averaging strategies for long-term exposure."
  },
  'ETH': {
    global_news_summary: "Ethereum leads Layer 1 innovation with successful Dencun upgrade reducing gas fees by 40%. DeFi ecosystem on Ethereum shows $45B+ TVL with major protocols launching new features. Enterprise adoption increases with Fortune 500 companies exploring Ethereum solutions. Layer 2 solutions achieve record transaction volumes. Staking participation reaches 25% of total supply. NFT market shows resilience with renewed institutional interest.",
    user_comments_summary: "Ethereum community actively discusses scalability improvements and DeFi innovations. 980+ comments highlight excitement about Layer 2 growth and reduced transaction costs. Developers praise Dencun upgrade impact on user experience. Validators report increased staking rewards. DeFi users express satisfaction with improved capital efficiency. Technical community debates future roadmap including proto-danksharding.",
    market_sentiment_summary: "Market sentiment for Ethereum shows 85.2% bullish vs 14.8% bearish based on 380+ votes. Technical analysis shows strong support at $3,500 with resistance at $4,000. Network fundamentals improve with increasing active addresses and transaction counts. DeFi metrics show growing user adoption and protocol revenue. Staking economics remain attractive with 4.2% annual yield.",
    final_summary: "Ethereum demonstrates technological leadership with successful upgrades and growing ecosystem adoption. Layer 2 solutions enhance scalability while maintaining security. Institutional interest in DeFi and enterprise solutions drives long-term value. Risk factors include competition from other L1s and regulatory uncertainty. Consider exposure through ETH and quality DeFi protocols."
  },
  'SOL': {
    global_news_summary: "Solana achieves record throughput with 65,000 TPS during peak usage. Major DeFi protocols migrate to Solana attracted by low fees and high speed. Breakpoint conference showcases ecosystem growth with 500+ projects. NFT marketplace activity surges with new collections launching weekly. Venture capital investment in Solana ecosystem exceeds $2B. Network uptime improves to 99.9% following infrastructure upgrades.",
    user_comments_summary: "Solana community enthusiasm evident with 750+ comments discussing network performance and ecosystem growth. Developers praise developer experience and tooling improvements. Traders focus on SOL's price action against ETH and BTC. NFT collectors celebrate platform innovation and low minting costs. Technical users discuss network reliability improvements following past outages.",
    market_sentiment_summary: "Market sentiment for Solana shows 82.3% bullish vs 17.7% bearish based on 320+ votes. Price action shows strong momentum with key resistance at $120. Network fundamentals improve with increasing active addresses and transaction volume. DeFi TVL on Solana grows to $1.5B. Developer activity metrics show strong ecosystem growth.",
    final_summary: "Solana demonstrates impressive technical performance with growing ecosystem adoption. Low fees and high speed attract both users and developers. Network reliability improvements address previous concerns. Risk factors include centralization concerns and competition from other L1s. Consider exposure for high-growth DeFi and NFT sectors."
  },
  'DOGE': {
    global_news_summary: "Dogecoin gains mainstream acceptance with increased merchant adoption. Payment processing integrations expand with major platforms supporting DOGE payments. Community-driven development focuses on utility improvements. Celebrity endorsements continue to drive retail interest. Technical upgrades explore Layer 2 solutions for scalability. Social media sentiment remains strongly positive with active community engagement.",
    user_comments_summary: "Dogecoin community shows passionate support with 1,100+ comments celebrating merchant adoption milestones. Meme culture thrives with creative content driving engagement. Long-term holders express confidence in DOGE's payment potential. New investors discuss entry strategies and long-term value proposition. Technical debates focus on scalability solutions and network upgrades.",
    market_sentiment_summary: "Market sentiment for Dogecoin shows 68.9% bullish vs 31.1% bearish based on 280+ votes. Social media metrics indicate strong community engagement and positive sentiment. Transaction volume increases with growing payment usage. Technical analysis shows consolidation pattern with potential for breakout. Whale accumulation patterns suggest institutional interest.",
    final_summary: "Dogecoin maintains cultural significance with growing payment utility. Community strength remains a key competitive advantage. Risk factors include limited technical development and meme-driven volatility. Consider small allocation for speculative exposure to meme culture and payment innovation."
  },
  'ADA': {
    global_news_summary: "Cardano advances smart contract capabilities with successful Alonzo upgrades. DeFi ecosystem on Cardano shows steady growth with $800M TVL. Academic partnerships strengthen blockchain research and development. Governance model demonstrates effective community decision-making. Enterprise solutions gain traction in supply chain and identity management. Shelley decentralization milestones achieved with 1,000+ stake pools.",
    user_comments_summary: "Cardano community engages deeply with 650+ comments discussing technical developments and governance. Academic community praises peer-reviewed approach to development. DeFi users explore new protocols launching on Cardano. Stake pool operators report healthy staking rewards and decentralization. Technical debates focus on scalability roadmap and smart contract adoption.",
    market_sentiment_summary: "Market sentiment for Cardano shows 72.4% bullish vs 27.6% bearish based on 290+ votes. Technical analysis shows consolidation with support at $0.45. Network fundamentals improve with increasing development activity and GitHub commits. Staking participation remains high at 70% of circulating supply. DeFi metrics show gradual ecosystem growth.",
    final_summary: "Cardano demonstrates methodical development approach with strong academic foundation. Governance model proves effective for long-term decision-making. Risk factors include slower development pace and competition from more established L1s. Consider exposure for methodical, research-driven blockchain development."
  },
  'XRP': {
    global_news_summary: "Ripple achieves regulatory clarity with favorable court rulings. Cross-border payment solutions expand with new banking partnerships. XRP Ledger shows increased adoption for remittances and institutional payments. Central bank digital currency (CBDC) partnerships progress in multiple jurisdictions. Technical upgrades focus on speed and cost efficiency. Community governance model evolves with increasing decentralization.",
    user_comments_summary: "XRP community shows renewed optimism with 580+ comments discussing regulatory victories and banking partnerships. Payment industry professionals praise XRP's utility for cross-border transactions. Technical community discusses ledger improvements and scaling solutions. Long-term holders express confidence in XRP's payment network value. Regulatory developments dominate community discussions.",
    market_sentiment_summary: "Market sentiment for XRP shows 75.8% bullish vs 24.2% bearish based on 310+ votes. Price action shows recovery momentum with key resistance at $0.65. Network metrics show increasing transaction volume and active addresses. Institutional adoption indicators show positive trends. Legal clarity improves institutional confidence.",
    final_summary: "XRP demonstrates strong utility in cross-border payments with growing institutional adoption. Regulatory clarity removes significant overhang. Risk factors include competition from other payment solutions and ongoing legal challenges. Consider exposure for payment infrastructure and cross-border remittance growth."
  },
  'DOT': {
    global_news_summary: "Polkadot ecosystem expands with 50+ parachains successfully launched. Cross-chain interoperability demonstrates technical superiority with seamless asset transfers. Developer grants program fuels innovation across DeFi, gaming, and enterprise solutions. Governance system proves effective with active community participation. Technical upgrades focus on scalability and user experience. Web3 foundation funding supports ecosystem growth.",
    user_comments_summary: "Polkadot technical community engages deeply with 520+ comments discussing parachain development and interoperability. Developers praise cross-chain communication protocols. DeFi users explore multi-chain strategies using Polkadot bridges. Governance participants discuss treasury allocation and ecosystem funding. Technical debates focus on scalability roadmap and security models.",
    market_sentiment_summary: "Market sentiment for Polkadot shows 69.7% bullish vs 30.3% bearish based on 270+ votes. Technical analysis shows accumulation pattern with support at $7.50. Ecosystem metrics show growing parachain activity and developer engagement. Cross-chain volume increases with new bridge deployments. Treasury utilization demonstrates effective governance.",
    final_summary: "Polkadot leads in interoperability innovation with growing ecosystem adoption. Technical architecture addresses key blockchain scalability challenges. Risk factors include competition from other interoperability solutions and complexity of ecosystem. Consider exposure for multi-chain future and cross-chain innovation."
  },
  'AVAX': {
    global_news_summary: "Avalanche achieves record DeFi activity with $2.5B+ TVL. Subnet architecture attracts enterprise and gaming projects. Gaming ecosystem shows explosive growth with major titles launching. Institutional partnerships strengthen with financial services adoption. Technical improvements focus on subnet scalability and cross-chain bridges. Carbon-neutral network status appeals to ESG-focused investors.",
    user_comments_summary: "Avalanche community shows excitement with 480+ comments discussing subnet growth and gaming adoption. Gaming community praises platform performance and low fees. DeFi users explore yield opportunities across Avalanche protocols. Enterprise developers discuss subnet deployment for specific use cases. Technical debates focus on subnet economics and cross-chain compatibility.",
    market_sentiment_summary: "Market sentiment for Avalanche shows 76.2% bullish vs 23.8% bearish based on 260+ votes. Price action shows strong momentum with resistance at $40. Network metrics show increasing transaction volume and active addresses. Gaming ecosystem metrics show explosive user growth. DeFi TVL demonstrates ecosystem strength.",
    final_summary: "Avalanche demonstrates strong performance in gaming and enterprise subnet adoption. Technical architecture enables specialized blockchain solutions. Risk factors include competition from other gaming chains and subnet adoption challenges. Consider exposure for gaming ecosystem growth and enterprise subnet innovation."
  },
  'LINK': {
    global_news_summary: "Chainlink expands oracle network with 1,000+ integrations across DeFi, enterprise, and gaming. Price feeds demonstrate reliability during market volatility with 99.9% uptime. Cross-chain interoperability solutions gain adoption across multiple blockchains. Enterprise partnerships grow with traditional financial institutions. staking program shows strong participation with 75M LINK staked. Technical upgrades focus on data accuracy and cost efficiency.",
    user_comments_summary: "Chainlink community shows confidence with 420+ comments discussing oracle reliability and network growth. DeFi developers praise price feed accuracy and reliability. Enterprise users discuss data integration benefits. Staking participants express satisfaction with rewards and network security. Technical debates focus on data source diversity and cross-chain solutions.",
    market_sentiment_summary: "Market sentiment for Chainlink shows 73.5% bullish vs 26.5% bearish based on 240+ votes. Technical analysis shows consolidation with support at $14. Network metrics show increasing integrations and data requests. Staking metrics demonstrate strong community participation. Revenue from oracle services shows steady growth.",
    final_summary: "Chainlink maintains critical infrastructure position with growing oracle network adoption. Reliability and security track record builds trust across ecosystems. Risk factors include competition from other oracle solutions and dependency on crypto market growth. Consider exposure for essential blockchain infrastructure and data oracle growth."
  },
  'MATIC': {
    global_news_summary: "Polygon achieves record scalability with 100M+ monthly transactions. zkEVM development progresses with successful testnet deployments. Enterprise partnerships expand with major brands adopting Polygon solutions. DeFi ecosystem shows strong growth with $1.8B TVL. NFT marketplace activity increases with gaming and metaverse projects. Carbon-neutral initiatives strengthen ESG credentials.",
    user_comments_summary: "Polygon community shows enthusiasm with 550+ comments discussing scalability achievements and zkEVM progress. Developers praise low fees and fast transaction speeds. DeFi users explore yield opportunities across Polygon protocols. Gaming community celebrates platform performance for NFT and gaming applications. Technical debates focus on zkEVM roadmap and Ethereum compatibility.",
    market_sentiment_summary: "Market sentiment for Polygon shows 78.9% bullish vs 21.1% bearish based on 300+ votes. Price action shows strong momentum with resistance at $1.20. Network metrics show increasing transaction volume and active addresses. DeFi TVL demonstrates ecosystem strength and user adoption. Developer activity metrics show strong ecosystem growth.",
    final_summary: "Polygon demonstrates strong scalability solutions with growing ecosystem adoption. zkEVM development promises enhanced Ethereum compatibility. Risk factors include competition from other L2 solutions and dependency on Ethereum. Consider exposure for Layer 2 scaling solutions and Ethereum ecosystem growth."
  },
  // Stocks
  'RELIANCE': {
    global_news_summary: "Reliance Industries reports strong Q3 FY24 performance with consolidated revenue of ₹2.4 lakh crore, up 12% YoY. Jio Platforms adds 25M new subscribers, reaching 450M user base. Retail business expands with 3,000 new stores across India. Green energy initiatives progress with 10GW renewable capacity target. Oil-to-chemicals segment shows margin improvement. Digital services revenue grows 18% driven by 5G rollout and enterprise solutions.",
    user_comments_summary: "Investor community shows strong engagement with 890+ comments discussing Reliance's diversification strategy. Retail investors express confidence in Jio's market dominance. Energy sector analysts focus on transition to renewable energy. Technical traders discuss stock performance relative to Nifty 50. Long-term holders praise management's strategic vision and execution capabilities.",
    market_sentiment_summary: "Market sentiment for Reliance shows 71.2% bullish vs 28.8% bearish based on 420+ votes. Technical analysis shows uptrend with support at ₹2,800 and resistance at ₹3,000. Fundamentals improve with strong operating margins across segments. Institutional holding increases to 52% of float. Analyst ratings average 4.2/5 with price targets ranging from ₹3,200-3,500.",
    final_summary: "Reliance Industries demonstrates strong execution across business verticals with digital and energy transition driving growth. Jio's market leadership and retail expansion provide stable cash flows. Risk factors include oil price volatility and regulatory challenges. Consider exposure for diversified conglomerate with strong digital and energy transition themes."
  },
  'TCS': {
    global_news_summary: "Tata Consultancy Services reports Q3 FY24 revenue of ₹60,000 crore, up 8% YoY, beating analyst expectations. Large deal wins worth $7.3B demonstrate strong client confidence. AI and cloud services grow 25% contributing 35% of revenue. Geographic diversification continues with North America growing 6% and Europe 12%. Employee utilization rate improves to 85%. Digital transformation projects drive margin expansion.",
    user_comments_summary: "TCS community shows confidence with 680+ comments discussing digital transformation capabilities. IT sector analysts praise deal quality and client retention rates. Technical investors focus on margin improvement and dividend yield. Employees discuss career growth opportunities and work culture. Long-term holders express confidence in TCS's market leadership and innovation capabilities.",
    market_sentiment_summary: "Market sentiment for TCS shows 74.6% bullish vs 25.4% bearish based on 380+ votes. Technical analysis shows consolidation with support at ₹3,800 and resistance at ₹4,200. Fundamentals remain strong with industry-leading margins and cash conversion. Institutional holding stable at 68%. Analyst ratings average 4.1/5 with price targets ₹4,300-4,600.",
    final_summary: "TCS maintains IT services leadership with strong digital transformation capabilities. Large deal wins demonstrate client confidence in AI and cloud expertise. Risk factors include global IT spending slowdown and currency fluctuations. Consider exposure for quality IT services with strong digital capabilities and dividend yield."
  },
  'HDFCBANK': {
    global_news_summary: "HDFC Bank reports Q3 FY24 net profit of ₹13,000 crore, up 20% YoY, driven by strong loan growth. Net interest margin improves to 4.2% on better asset quality. Digital banking initiatives show 40% of transactions through digital channels. Credit card business grows 25% with premium segment focus. Rural expansion continues with 500 new branches. Capital adequacy ratio remains strong at 16.8%.",
    user_comments_summary: "HDFC Bank community shows confidence with 720+ comments discussing digital transformation and growth strategy. Banking sector analysts focus on asset quality and NIM improvement. Retail investors praise consistent dividend policy and returns. Technical traders discuss stock performance relative to banking index. Long-term holders express confidence in management's risk management capabilities.",
    market_sentiment_summary: "Market sentiment for HDFC Bank shows 68.4% bullish vs 31.6% bearish based on 350+ votes. Technical analysis shows uptrend with support at ₹1,600 and resistance at ₹1,800. Fundamentals improve with strong loan growth and improving asset quality. Institutional holding increases to 58%. Analyst ratings average 4.0/5 with price targets ₹1,850-2,000.",
    final_summary: "HDFC Bank demonstrates strong banking fundamentals with improving margins and digital leadership. Consistent execution and risk management maintain investor confidence. Risk factors include credit cycle impact and competition from fintech. Consider exposure for quality private sector bank with digital capabilities and consistent dividend yield."
  },
  'INFY': {
    global_news_summary: "Infosys reports Q3 FY24 revenue of ₹38,000 crore, up 7% YoY, in line with expectations. Large deal wins of $4.5B highlight strong client relationships. AI and automation services grow 30% contributing 28% of revenue. North America revenue grows 8% while Europe grows 6%. Employee attrition reduces to 18% improving operational efficiency. Share buyback program of ₹18,000 crore announced.",
    user_comments_summary: "Infosys community shows cautious optimism with 520+ comments discussing AI capabilities and deal pipeline. IT sector analysts compare performance with peers and margin trends. Technical investors focus on valuation and dividend yield. Employees discuss training programs and career development. Long-term holders debate growth strategy and competitive positioning.",
    market_sentiment_summary: "Market sentiment for Infosys shows 65.8% bullish vs 34.2% bearish based on 320+ votes. Technical analysis shows range-bound movement with support at ₹1,400 and resistance at ₹1,600. Fundamentals remain stable with healthy cash flows and margins. Institutional holding at 62%. Analyst ratings average 3.8/5 with price targets ₹1,550-1,750.",
    final_summary: "Infosys maintains strong IT services position with growing AI capabilities. Large deal wins and client relationships provide growth visibility. Risk factors include margin pressure and global IT spending uncertainty. Consider exposure for quality IT services with AI focus and shareholder-friendly policies."
  },
  'ICICIBANK': {
    global_news_summary: "ICICI Bank reports Q3 FY24 net profit of ₹10,000 crore, up 15% YoY, driven by retail loan growth. Net interest margin stable at 4.1% with improved CASA ratio. Digital banking initiatives show 35% of transactions through mobile app. Credit card business grows 22% with focus on millennial customers. Overseas expansion continues with Singapore and UK operations. Capital adequacy strong at 17.2%.",
    user_comments_summary: "ICICI Bank community shows confidence with 580+ comments discussing digital innovation and growth strategy. Banking sector analysts focus on retail loan growth and asset quality. Retail investors praise digital banking experience and services. Technical traders discuss stock performance relative to sector. Long-term holders express confidence in technology initiatives and risk management.",
    market_sentiment_summary: "Market sentiment for ICICI Bank shows 70.3% bullish vs 29.7% bearish based on 340+ votes. Technical analysis shows uptrend with support at ₹950 and resistance at ₹1,100. Fundamentals improve with strong retail growth and digital adoption. Institutional holding at 55%. Analyst ratings average 3.9/5 with price targets ₹1,150-1,250.",
    final_summary: "ICICI Bank demonstrates strong retail banking capabilities with digital innovation driving growth. Consistent performance and improving asset quality maintain investor confidence. Risk factors include credit cycle impact and competition from digital banks. Consider exposure for private sector bank with strong retail focus and digital capabilities."
  },
  'SBIN': {
    global_news_summary: "State Bank of India reports Q3 FY24 net profit of ₹14,000 crore, up 25% YoY, beating expectations. Net interest margin improves to 3.8% on better yield management. Digital banking initiatives show 30% of transactions through YONO app. Retail loan portfolio grows 18% driven by housing and auto loans. Corporate loan book improves with better asset quality. Government support remains strong for financial inclusion.",
    user_comments_summary: "SBI community shows confidence with 650+ comments discussing digital transformation and government support. Banking sector analysts focus on NIM improvement and asset quality. Retail investors praise market leadership and dividend yield. Technical traders discuss stock performance relative to banking index. Long-term holders express confidence in government backing and reform initiatives.",
    market_sentiment_summary: "Market sentiment for SBI shows 67.2% bullish vs 32.8% bearish based on 360+ votes. Technical analysis shows uptrend with support at ₹600 and resistance at ₹750. Fundamentals improve with better margins and asset quality. Institutional holding at 45%. Analyst ratings average 3.7/5 with price targets ₹780-850.",
    final_summary: "SBI maintains market leadership with improving fundamentals and digital transformation. Government backing provides stability and growth opportunities. Risk factors include political interference and asset quality challenges. Consider exposure for market leader with government support and reform potential."
  },
  'LT': {
    global_news_summary: "Larsen & Toubro reports Q3 FY24 revenue of ₹45,000 crore, up 10% YoY, driven by infrastructure projects. Order book reaches record ₹4.5 lakh crore providing visibility. International business grows 15% contributing 35% of revenue. Defense and aerospace segment shows strong growth with new contracts. IT services subsidiary LTI shows 20% growth. Digital transformation initiatives improve operational efficiency.",
    user_comments_summary: "L&T community shows confidence with 420+ comments discussing order book and infrastructure opportunities. Engineering sector analysts focus on execution and margin improvement. Technical investors discuss stock performance relative to infrastructure index. Long-term holders express confidence in management's execution capabilities and diversification strategy.",
    market_sentiment_summary: "Market sentiment for L&T shows 72.8% bullish vs 27.2% bearish based on 280+ votes. Technical analysis shows uptrend with support at ₹2,800 and resistance at ₹3,200. Fundamentals improve with strong order book and execution capabilities. Institutional holding at 52%. Analyst ratings average 4.0/5 with price targets ₹3,300-3,600.",
    final_summary: "L&T demonstrates strong engineering capabilities with record order book providing growth visibility. Infrastructure spending and defense sector drive growth opportunities. Risk factors include execution challenges and economic cycle sensitivity. Consider exposure for infrastructure and engineering sector leader with strong order book."
  },
  'ITC': {
    global_news_summary: "ITC reports Q3 FY24 revenue of ₹18,000 crore, up 8% YoY, driven by FMCG and hotel businesses. FMCG segment grows 12% with new product launches and rural penetration. Hotel business shows strong recovery with 90% occupancy rates. Agricultural business benefits from strong commodity prices. Cigarette business maintains stable margins. New ventures in health and wellness show promising early traction.",
    user_comments_summary: "ITC community shows confidence with 480+ comments discussing FMCG growth and diversification strategy. Consumer goods analysts focus on market share gains and new product launches. Technical investors discuss stock performance relative to consumer index. Long-term holders express confidence in brand portfolio and distribution network.",
    market_sentiment_summary: "Market sentiment for ITC shows 69.5% bullish vs 30.5% bearish based on 300+ votes. Technical analysis shows consolidation with support at ₹350 and resistance at ₹400. Fundamentals improve with FMCG growth and hotel recovery. Institutional holding at 48%. Analyst ratings average 3.9/5 with price targets ₹410-440.",
    final_summary: "ITC demonstrates strong FMCG capabilities with successful diversification strategy. Brand portfolio and distribution network provide competitive advantage. Risk factors include regulatory challenges and competition in FMCG sector. Consider exposure for consumer goods leader with strong brands and diversification."
  },
  'AXISBANK': {
    global_news_summary: "Axis Bank reports Q3 FY24 net profit of ₹6,000 crore, up 12% YoY, driven by corporate and retail growth. Net interest margin improves to 4.0% on better asset liability management. Digital banking initiatives show 32% of transactions through mobile app. SME loan portfolio grows 20% with focus on digital lending. Wealth management business grows 18% with new product offerings. Capital adequacy strong at 16.5%.",
    user_comments_summary: "Axis Bank community shows confidence with 380+ comments discussing digital transformation and growth strategy. Banking sector analysts focus on SME lending and wealth management. Retail investors praise digital banking experience and product innovation. Technical traders discuss stock performance relative to banking sector. Long-term holders express confidence in technology investments and risk management.",
    market_sentiment_summary: "Market sentiment for Axis Bank shows 66.4% bullish vs 33.6% bearish based on 260+ votes. Technical analysis shows range-bound movement with support at ₹900 and resistance at ₹1,050. Fundamentals improve with better margins and digital adoption. Institutional holding at 50%. Analyst ratings average 3.8/5 with price targets ₹1,080-1,180.",
    final_summary: "Axis Bank demonstrates strong retail and SME banking capabilities with digital innovation. Wealth management and SME lending provide growth opportunities. Risk factors include asset quality challenges and competition from fintech. Consider exposure for private sector bank with strong SME focus and digital capabilities."
  },
  'KOTAKBANK': {
    global_news_summary: "Kotak Mahindra Bank reports Q3 FY24 net profit of ₹7,000 crore, up 18% YoY, driven by wealth management and digital services. Net interest margin stable at 4.3% with strong CASA ratio. Digital banking initiatives show 40% of transactions through mobile app. Wealth management AUM grows 25% to ₹3 lakh crore. Corporate banking shows strong growth with mid-cap focus. Capital adequacy strong at 18.2%.",
    user_comments_summary: "Kotak Bank community shows confidence with 320+ comments discussing wealth management and digital leadership. Banking sector analysts focus on NIM leadership and capital efficiency. Retail investors praise digital banking experience and investment products. Technical traders discuss stock performance relative to banking index. Long-term holders express confidence in conservative management approach.",
    market_sentiment_summary: "Market sentiment for Kotak Bank shows 71.8% bullish vs 28.2% bearish based on 240+ votes. Technical analysis shows uptrend with support at ₹1,800 and resistance at ₹2,100. Fundamentals remain strong with industry-leading NIM and capital efficiency. Institutional holding at 65%. Analyst ratings average 4.1/5 with price targets ₹2,150-2,350.",
    final_summary: "Kotak Bank demonstrates strong wealth management and digital banking capabilities. Conservative risk management and capital efficiency maintain investor confidence. Risk factors include slower growth compared to peers and digital competition. Consider exposure for quality private sector bank with wealth management focus and strong capital position."
  }
};

async function uploadComprehensiveIntelligence() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crowdverse');
    console.log('✅ Connected to MongoDB');

    // Clear existing intelligence data
    await Intelligence.deleteMany({});
    console.log('🗑️ Cleared existing intelligence data');

    // Upload comprehensive intelligence data for all assets
    const uploadPromises = Object.entries(comprehensiveIntelligenceData).map(async ([asset, data]) => {
      const assetType = ['BTC', 'ETH', 'SOL', 'DOGE', 'ADA', 'XRP', 'DOT', 'AVAX', 'LINK', 'MATIC'].includes(asset) ? 'crypto' : 'stock';
      
      const intelligenceDoc = {
        asset: asset,
        assetType: assetType,
        global_news_summary: data.global_news_summary,
        user_comments_summary: data.user_comments_summary,
        market_sentiment_summary: data.market_sentiment_summary,
        final_summary: data.final_summary,
        data_points: {
          comments_count: Math.floor(Math.random() * 500) + 200,
          sentiment_votes: Math.floor(Math.random() * 200) + 50,
          trade_votes: Math.floor(Math.random() * 150) + 30,
          bullish_percent: Math.floor(Math.random() * 30) + 60,
          buy_percent: Math.floor(Math.random() * 20) + 40
        },
        generated_at: new Date(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        analysis_provider: 'comprehensive-intelligence-data'
      };

      await Intelligence.findOneAndUpdate(
        { asset: asset, assetType: assetType },
        intelligenceDoc,
        { upsert: true, new: true }
      );
      
      console.log(`✅ Uploaded comprehensive intelligence for ${asset}`);
    });

    await Promise.all(uploadPromises);
    console.log('🎉 All comprehensive intelligence data uploaded successfully!');

    // Verify upload
    const count = await Intelligence.countDocuments();
    console.log(`📊 Total intelligence documents in database: ${count}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error uploading comprehensive intelligence:', error);
    process.exit(1);
  }
}

uploadComprehensiveIntelligence();
