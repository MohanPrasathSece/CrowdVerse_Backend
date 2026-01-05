const mongoose = require('mongoose');
require('dotenv').config();
const News = require('./models/News');

const static2026News = [
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
    {
        title: "US-India Trade Deal 2.0 Focuses on Semiconductor Supply Chain",
        summary: "Washington and New Delhi sign an expanded strategic partnership to secure 40% of the global chip supply chain. The deal includes visa fast-tracking for Indian tech talent and multi-billion dollar US subsidies for fabs in Gujarat and Karnataka, significantly boosting local manufacturing.",
        content: "The second phase of the US-India Critical Technology Partnership was signed yesterday, cementing a bilateral effort to reduce reliance on East Asian chip manufacturing. Under the new terms, US firms will receive tax credits for setting up semiconductor fabrication units in India's Gujarat and Karnataka states.\n\nWait times for H-1B visas for specialized tech workers have also been slashed to 2 weeks under the agreement. 'This is the most significant technology transfer pact in history,' claimed the US Secretary of State. Market analysts expect a surge in Indian tech stocks following the news. The deal also includes joint research into quantum computing, aiming to develop the first commercially viable quantum processor in Bangalore by 2028.",
        source: "Trade Winds",
        category: "Geopolitics",
        sentiment: "bullish",
        imageUrl: "https://images.unsplash.com/photo-1555664424-778a69022365?auto=format&fit=crop&q=80&w=1000",
        poll: { question: "Impact on Indian job market?", options: ["Huge Growth", "Minimal", "Brain Drain"] }
    },
    {
        title: "New Education Policy 2026: AI Literacy Mandatory for All Students",
        summary: "The Ministry of Education updates the NEP to include mandatory computational logic and basic AI ethics for all high school streams, starting the 2026 academic year. The change aims to equip the next generation with the tools to navigate a world dominated by automated systems and algorithmic decisions.",
        content: "In a move to future-proof the workforce, the Ministry of Education has mandated 'Computational Logic & AI Ethics' as a core subject for Class 11 and 12 students across all streams. The update to the National Education Policy (NEP) asserts that digital literacy is now as fundamental as language skills.\n\n'We are not trying to make everyone a coder, but everyone must understand the logic that runs our world,' stated the Education Minister. Schools have been given a 1-year window to upgrade infrastructure. Ed-tech stocks rallied 5% on the announcement. Critics point to the digital divide in rural schools, but the government has pledged 1 lakh AI-ready tablets to government schools to bridge the gap.",
        source: "EduTimes 2026",
        category: "Politics",
        sentiment: "neutral",
        imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1000",
        poll: { question: "Is coding necessary for Arts students?", options: ["Yes, essential", "No, burden", "Optional only"] }
    },
    {
        title: "Mars India Mission: ISRO Prepares for Permanent Habitat Launch",
        summary: "ISRO announces the countdown for the 2026 Mangalyaan-3, which will carry the first modular habitat components to the Red Planet. This mission signals India's intent to establish a permanent presence in deep space alongside other major space-faring nations.",
        content: "The Indian Space Research Organisation (ISRO) has entered the final phase of testing for Mangalyaan-3. Unlike previous missions, this flight carries specialized robotic units designed to 3D-print soil-stabilized habitats using Martian regolith. The mission is part of the 'Akash Ganga' program aimed at sending an Indian astronaut to Mars by 2035.\n\nGlobal space agencies have praised the cost-effective launch vehicle developed by ISRO, which uses a new methane-based fuel. The mission also carries several private-sector payloads, highlighting the growing commercialization of the Indian space industry. Public excitement is at an all-time high, with schools across India organizing 'Mars Day' celebrations.",
        source: "Space Explorer",
        category: "General",
        sentiment: "bullish",
        imageUrl: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&q=80&w=1000",
        poll: { question: "Should we spend more on space?", options: ["Yes, future!", "No, focus on Earth", "Neutral"] }
    },
    {
        title: "Urban Farming Revolution Hits Delhi and Mumbai",
        summary: "High-tech hydroponic towers are popping up across metro rooftops, reducing vegetable prices by 20%. The urban farming movement, driven by IoT and sustainable nutrients, is transforming how city dwellers source their daily produce.",
        content: "A green revolution is taking root in India's densest urban centers. Vertical farming startups have seen a 300% growth in the last year, fueled by government subsidies for 'Green Rooftops'. Using automated nutrient delivery systems, these farms use 90% less water than traditional agriculture.\n\nResidents claim the produce is fresher and free from market pesticides. 'I harvest my own spinach every morning,' says a Mumbai resident. While initially expensive, the costs have dropped as local hardware manufacturing for hydroponic kits has scaled up. Municipal corporations are now considering tax breaks for buildings that contribute to the city's food security.",
        source: "Green City Journal",
        category: "General",
        sentiment: "bullish",
        imageUrl: "https://images.unsplash.com/photo-1558449028-s541374824d1?auto=format&fit=crop&q=80&w=1000",
        poll: { question: "Would you grow food on your roof?", options: ["Yes, definitely", "Lack of space", "Too much effort"] }
    },
    {
        title: "India-UK Free Trade Agreement Finally Signed",
        summary: "After years of negotiation, London and New Delhi finalize a comprehensive trade pact. The deal removes 95% of tariffs on whiskey, electronics, and textiles, while allowing easier movement for professionals between the two nations.",
        content: "The Prime Ministers of India and the UK signed the historic 'Deep Partnership' Free Trade Agreement (FTA) today in London. The deal is expected to double bilateral trade by 2030. Key gains for India include zero-duty access for textile exports and a special quota for nursing and hospitality professionals.\n\nIn return, India has lowered tariffs on British automotive parts and high-end consumer goods. Small businesses on both sides are optimistic about the streamlined customs procedures. The deal also includes a data-adequacy clause, making it easier for Indian IT firms to handle UK data. 'This is a natural alliance for the digital age,' said the UK Trade Secretary.",
        source: "Global Commerce",
        category: "Geopolitics",
        sentiment: "bullish",
        imageUrl: "https://images.unsplash.com/photo-1521295121812-323232df2160?auto=format&fit=crop&q=80&w=1000",
        poll: { question: "Will prices drop for consumers?", options: ["Yes, soon", "No change", "Only for luxury"] }
    },
    {
        title: "Genome-Testing Kits Become Mainstream in Healthcare",
        summary: "Affordable genetic screening is replacing routine blood tests as the first step in preventive medicine. Over 10 million Indians have opted for genome mapping in 2025-26, leading to a surge in personalized lifestyle and dietary recommendations.",
        content: "Predictive healthcare has seen a massive surge as genome sequencing costs dropped below ₹5,000 for the first time. The 'Digital Health Mission' has successfully integrated genetic profiles into the Unified Health Interface. Doctors can now prescribe medications based on an individual's specific metabolic response, significantly reducing adverse drug reactions.\n\nPrivate insurers are beginning to offer lower premiums for those who follow genetically personalized wellness plans. Challenges remain regarding genetic privacy and data security, but the Ministry of Health has introduced a strict 'Biometric Protection Act' to prevent misuse. This shift marks the end of the 'one-size-fits-all' approach to Indian medicine.",
        source: "Health Pulse",
        category: "General",
        sentiment: "neutral",
        imageUrl: "https://images.unsplash.com/photo-1579152276502-545a248aef9d?auto=format&fit=crop&q=80&w=1000",
        poll: { question: "Is genome privacy a concern?", options: ["Yes, very much", "No, for health only", "Neutral"] }
    }
];

function getWeekId() {
    const now = new Date();
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((now - oneJan) / (24 * 60 * 60 * 1000));
    const result = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);
    return `${now.getFullYear()}-W${result}`;
}

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    const weekId = getWeekId();
    let count = 0;
    for (const art of static2026News) {
        const exists = await News.findOne({ title: art.title });
        if (!exists) {
            await new News({ ...art, weekId }).save();
            count++;
        }
    }
    console.log(`Seeded ${count} high-quality 2026 articles.`);
    process.exit();
}
seed();
