const mongoose = require('mongoose');
require('dotenv').config();
const News = require('./models/News');
const Poll = require('./models/Poll');

const static2026News = [
    // GENERAL / POLITICS
    {
        title: "India's 'Digital Rupee' Usage Surpasses Cash in Metro Cities",
        summary: "In a historic shift for the economy, the Reserve Bank of India reports that CBDC transactions have officially overtaken physical cash usage in Mumbai, Delhi, and Bangalore. The shift marks the success of the unified digital payment infrastructure launched in late 2024. Economists suggest this move has reduced the shadow economy by nearly 12% in just eighteen months, leading to a significant increase in tax compliance across urban centers.",
        content: "The Reserve Bank of India (RBI) confirmed today that the Digital Rupee (e₹) has surpassed physical currency in transaction volume across India's Tier-1 cities. This milestone comes just two years after the full-scale rollout of the Central Bank Digital Currency. Merchants cite lower transaction fees and instant settlement as primary drivers for the switch.\n\nHowever, privacy advocates continue to raise concerns about the traceability of digital funds. The government has assured citizens that transactions under ₹50,000 remain anonymous, a policy that has helped spur adoption among small vendors. Economists predict this shift will boost formal economic participation by 15% over the next fiscal year. The RBI is now looking to expand the offline capabilities of the digital rupee to rural areas where internet connectivity remains spotty, ensuring that the benefit of a digital economy reaches every corner of the nation.",
        source: "Future Finance India",
        category: "Politics",
        sentiment: "bullish",
        imageUrl: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=1000",
        poll: { question: "Is a cashless society good for India?", options: ["Yes, simpler", "No, privacy risk", "Neutral"] }
    },
    {
        title: "Global Summit: India Leads 'Global South' Clean Energy Alliance",
        summary: "Prime Minister's keynote at the 2026 Climate Summit establishes India as the de-facto leader of the new Global South Solar Alliance. The initiative pledges $50 billion in cross-border solar grid investments between India, Africa, and Southeast Asia, aiming to provide sustainable power to over 2 billion people by the end of the decade.",
        content: "India has formally taken the helm of the newly minted 'Global South Clean Energy Alliance', a coalition of 40 nations committed to bypassing fossil fuel dependence. The announcement was made during the 2026 New Delhi Climate Summit, drawing applause from UN delegates. The core of the plan involves a trans-continental solar grid connecting Indian solar parks with storage facilities in Africa.\n\nCritics argue the timeline is overly ambitious, citing geopolitical instability in transit regions. However, the Indian Ministry of External Affairs highlights that energy interdependence could actually serve as a stabilizing diplomatic force. Construction on the first undersea cable to Sri Lanka is set to begin next month. This initiative follows India's success in achieving 500GW of renewable capacity internally, ahead of its 2030 target, proving that green growth is possible for developing nations.",
        source: "GeoPol Daily",
        category: "Geopolitics",
        sentiment: "bullish",
        imageUrl: "https://images.unsplash.com/photo-1548613053-220e753733ce?auto=format&fit=crop&q=80&w=1000",
        poll: { question: "Will this boost India's global influence?", options: ["Yes, significantly", "No difference", "Too risky"] }
    },
    {
        title: "Supreme Court to Hear Plea on AI Rights and Copyright",
        summary: "The apex court agrees to hear a landmark public interest litigation defining the rights of AI entities and the copyright status of AI-generated art. Legal scholars believe the verdict could set a global precedent for how the law treats non-human creativity in the age of generative intelligence.",
        content: "The Supreme Court of India has admitted a petition challenging the current copyright laws which exclude AI-generated works from protection. The case, brought by a consortium of tech startups and artists, argues that the 'human authorship' requirement is outdated in 2026. The bench observed that the rapid integration of AGI in daily life requires a re-examination of constitutional definitions of 'creator'.\n\nLegal experts suggest the court might favor a middle path, granting a new class of 'synthetic rights' that belong to the prompter rather than the machine. The hearing is scheduled for next week and is expected to draw international attention. This comes after a series of high-profile lawsuits where independent filmmakers used AI to recreate historical events, leading to a debate on truth versus digital fabrication in the public record.",
        source: "Legal Eagle",
        category: "Politics",
        sentiment: "neutral",
        imageUrl: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=1000",
        poll: { question: "Should AI art be copyrighted?", options: ["Yes", "No", "Complex issue"] }
    },
    // STOCKS
    {
        title: "Apple Announces First Fully Autonomous 'iCar' for 2027 Launch",
        summary: "Tech giant Apple surprises Wall Street with a working prototype of its level-5 autonomous vehicle. Shares of AAPL surged 8% in after-hours trading, while traditional automakers saw minor corrections. The vehicle reportedly uses a proprietary 'Photon' chip capable of trillion-range calculations per second.",
        content: "Apple Inc. has officially broken its silence on 'Project Titan', unveiling a sleek, steering-wheel-less vehicle at its Cupertino headquarters today. The 'iCar' is designed as a luxury lounge on wheels, focusing on seamless integration with the Apple ecosystem. Tim Cook stated that the vehicle represents the 'ultimate integration of hardware, software, and services'.\n\nAnalysts are torn on the valuation impact, but the bullish cohort suggests Apple could capture 5% of the global luxury auto market within three years. Competitors like Tesla and BYD have yet to comment, though industry insiders suggest a new 'Silicon Valley Auto War' is officially underway. Infrastructure partners for charging networks are expected to be announced next quarter.",
        source: "Market Watch 2026",
        category: "Stocks",
        sentiment: "bullish",
        imageUrl: "https://images.unsplash.com/photo-1593941707882-a5bba1491017?auto=format&fit=crop&q=80&w=1000",
        poll: { question: "Would you buy an Apple Car?", options: ["Yes, definitely", "No, too expensive", "Wait and see"] }
    },
    {
        title: "Nifty 50 Hits Historic 30,000 Mark Amid Economic Growth",
        summary: "The Indian benchmark index cross the psychological barrier of 30,000 as foreign institutional investors (FIIs) pour capital into the manufacturing and defense sectors. GDP growth for the current quarter surpassed expectations at 8.2%, fueling a broad-based rally across mid-cap and large-cap stocks.",
        content: "It was a red-letter day for Indian markets as the Nifty 50 closed at 30,145, up 1.5% for the day. The rally was led by banking and defense majors, following several large export contracts signed by Indian aerospace firms. The 'Make in India 2.0' initiative seems to be delivering on its promise of transforming India into a global manufacturing hub.\n\nRetail participation has cũng reached an all-time high, with over 150 million active demat accounts. While some analysts warn of overvaluation in the small-cap segment, the consensus remains positive for the long-term structural story. The RBI governor's recent hint at a possible rate cut next month has added further fuel to the bullish sentiment.",
        source: "Bombay Financial",
        category: "Stocks",
        sentiment: "bullish",
        imageUrl: "https://images.unsplash.com/photo-1611974717414-0435dfca6b70?auto=format&fit=crop&q=80&w=1000",
        poll: { question: "Nifty target for end of 2026?", options: ["32,000+", "30,000 (Stable)", "Correction coming"] }
    },
    // CRYPTO
    {
        title: "Bitcoin ETFs Capture 15% of Global Gold Investment Volume",
        summary: "Institutional shift accelerates as Bitcoin ETFs see record inflows, officially eating into the market share of traditional gold funds. Leading hedge funds now allocate an average of 3-5% of their portfolios to digital assets, citing Bitcoin's 'Digital Gold' status in a high-inflation environment.",
        content: "A landmark report from Goldman Sachs reveals that Bitcoin is increasingly being viewed as a primary hedge against currency debasement. The total market cap of Bitcoin has surpassed $3 trillion, driven by the massive success of spot ETFs in the US, Europe, and Asia. Sovereign wealth funds from at least three nations are rumored to be accumulating BTC as a reserve asset.\n\nTechnological improvements in the Lightning Network have also made micro-payments viable, increasing Bitcoin's utility beyond just a store of value. Regulatory clarity in the EU and the US has provided the necessary comfort for conservative pension funds to enter the space. Opponents still point to environmental concerns, though the mining industry claims 70% of its energy now comes from renewable sources.",
        source: "CoinDesk 2026",
        category: "Crypto",
        sentiment: "bullish",
        imageUrl: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&q=80&w=1000",
        poll: { question: "Is Bitcoin better than Gold?", options: ["Yes, for 2026", "Gold is safer", "Need both"] }
    },
    {
        title: "Ethereum 3.0 Roadmap Unveils 'The Grand Unification'",
        summary: "Vitalik Buterin presents the next phase of Ethereum, promising over 100,000 transactions per second through advanced sharding and zero-knowledge rollups. The update aims to make Ethereum the 'world computer' for decentralized finance and enterprise supply chains.",
        content: "The Ethereum Foundation has released the whitepaper for 'Ethereum 3.0', a massive upgrade set for 2027. The centerpiece of the upgrade is a new data-availability layer that drastically reduces gas fees for Layer 2 scaling solutions. This 'Grand Unification' will allow developers to build complex applications with the speed of centralized servers but the security of a decentralized network.\n\nSince the implementation of EIP-1559 and the transition to Proof-of-Stake, ETH has become a deflationary asset, heightening its appeal for long-term investors. Enterprise adoption has also surged, with global logistics firms using Ethereum to track real-time container movements across borders. The community remains excited, though some developers warn about the complexity of the transition.",
        source: "Ether Watch",
        category: "Crypto",
        sentiment: "bullish",
        imageUrl: "https://images.unsplash.com/photo-1622737133809-d95047b9e673?auto=format&fit=crop&q=80&w=1000",
        poll: { question: "Will ETH flip BTC eventually?", options: ["Yes, likely", "No, never", "They coexist"] }
    },
    // COMMODITIES
    {
        title: "Gold Prices Hit New Highs Amid Geopolitical Uncertainty",
        summary: "Safe-haven demand pushes gold prices above $3,000 per ounce for the first time in history. Tensions in the Middle East and concerns over the stability of the Euro have led central banks to increase their bullion reserves at the fastest pace since the 1970s.",
        content: "Gold continues its relentless march upward, closing at a record $3,120 today. The surge is being driven by a 'perfect storm' of geopolitical risks and a weakening US dollar. Retail investors are also piling into gold coins and bars, fearing a systemic banking crisis in Western Europe. Central banks of India, China, and Turkey added over 200 tonnes of gold to their vaults in the last quarter alone.\n\nMining companies are struggling to keep up with demand, as new discoveries are becoming increasingly scarce. 'This is a multi-year bull market,' says a leading commodities analyst. However, some warn that high prices might dampen demand for jewelry in key markets like India and China, which could lead to a minor correction in the short term.",
        source: "Refining Weekly",
        category: "Commodities",
        sentiment: "bullish",
        imageUrl: "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&q=80&w=1000",
        poll: { question: "Gold price end of year?", options: ["$3500+", "$3000 (Flat)", "Correction to $2500"] }
    }
];

const getWeekId = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDays = (now - startOfYear) / 86400000;
    const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNum}`;
};

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    const weekId = getWeekId();
    console.log(`Seeding for Week ID: ${weekId}`);
    let count = 0;
    for (const art of static2026News) {
        const exists = await News.findOne({ title: art.title });
        if (!exists) {
            const savedNews = await new News({ ...art, weekId }).save();

            // Generate poll
            await new Poll({
                newsId: savedNews._id,
                question: art.poll.question,
                options: art.poll.options.map(text => ({ text, votes: 0 }))
            }).save();

            count++;
        }
    }
    console.log(`Seeded ${count} high-quality 2026 articles with associated polls.`);
    process.exit();
}
seed();
