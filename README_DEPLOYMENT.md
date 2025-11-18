# Deployment Guide - Intelligence Panel Data

## Overview
The intelligence panel data is now automatically seeded when the server starts in production environments. This ensures that both crypto and stock assets have realistic intelligence data available immediately upon deployment.

## How It Works

### Automatic Seeding
- When the server connects to MongoDB, it automatically checks if intelligence data exists
- If no data is found, it seeds all crypto and stock assets with realistic, relatable intelligence data
- The data includes:
  - Global news summaries
  - User comments summaries  
  - Market sentiment summaries
  - Final summaries
  - Data points with relevant metrics

### Data Structure
The intelligence data is stored in MongoDB using the `Intelligence` model with:
- **Asset**: Full symbol (e.g., `BINANCE:BTCUSDT`, `RELIANCE`)
- **Asset Type**: 'crypto' or 'stock'
- **Summaries**: Four different analysis summaries
- **Data Points**: Array of metrics with type, value, and label
- **Expiration**: 24-hour TTL for automatic cleanup

### Environment Variables
Make sure these are set in your production environment:
```
MONGODB_URI=your_production_mongodb_connection_string
NODE_ENV=production
```

## Deployment Process

1. **Deploy your application** with the updated code
2. **Start the server** - it will automatically:
   - Connect to MongoDB
   - Check for existing intelligence data
   - Seed data if database is empty
   - Log the seeding process

3. **Verify deployment** by checking:
   - Server logs for seeding messages
   - Intelligence API endpoints returning data

## API Endpoints

### Get Intelligence Data
```
GET /api/ai-summary/intelligence/:asset
```

**Examples:**
- `/api/ai-summary/intelligence/BTC` (maps to BINANCE:BTCUSDT)
- `/api/ai-summary/intelligence/Ethereum` (maps to BINANCE:ETHUSDT)  
- `/api/ai-summary/intelligence/RELIANCE`

**Response Format:**
```json
{
  "global_news_summary": "...",
  "user_comments_summary": "...",
  "market_sentiment_summary": "...",
  "final_summary": "...",
  "data_points": [
    {
      "type": "adoption",
      "value": "85%",
      "label": "Institutional Adoption"
    }
  ],
  "generated_at": "...",
  "analysis_provider": "AI Analysis Engine"
}
```

## Asset Mapping

The system automatically maps various input formats to the correct database symbols:

### Crypto Assets
- **Names**: "Bitcoin", "Ethereum", "Solana" → `BINANCE:BTCUSDT`, `BINANCE:ETHUSDT`, etc.
- **Short Symbols**: "BTC", "ETH", "SOL" → `BINANCE:BTCUSDT`, `BINANCE:ETHUSDT`, etc.
- **Full Symbols**: "BINANCE:BTCUSDT" → `BINANCE:BTCUSDT`

### Stock Assets
- **Symbols**: "RELIANCE", "TCS" → "RELIANCE", "TCS"
- **Names**: "Reliance Industries Ltd." → "RELIANCE"

## Data Updates

The seeded data has a 24-hour expiration. After that, the system will:
1. Return fallback dummy data if no new data is generated
2. Allow real-time AI generation to replace the seeded data
3. Continue serving the most recent available data

## Troubleshooting

### Intelligence Panel Shows Empty
1. Check server logs for MongoDB connection
2. Verify `MONGODB_URI` is correctly set
3. Look for seeding messages in startup logs
4. Test API endpoints directly

### Data Not Appearing After Deployment
1. Restart the server to trigger seeding
2. Check if MongoDB is accessible from deployment environment
3. Verify database permissions and connection string

### Wrong Data Format
1. Ensure you're using the latest code with updated schema
2. Clear and reseed database if schema was updated
3. Check for schema migration issues

## Security Notes

- The intelligence data is designed to look realistic but is dummy data
- No actual market analysis or AI predictions are included in seeded data
- Production environment will eventually replace this with real AI-generated content
- All sensitive seeding code has been removed from the repository

## Monitoring

Monitor these metrics in production:
- Intelligence API response times
- Database query performance
- Data expiration and renewal
- Error rates for intelligence endpoints

## Next Steps

After deployment:
1. Monitor intelligence panel functionality
2. Set up real-time AI generation for live data
3. Configure automated data refresh schedules
4. Implement user analytics for intelligence panel usage
