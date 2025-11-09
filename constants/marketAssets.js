const cryptoAssets = [
  { symbol: 'BINANCE:BTCUSDT', name: 'Bitcoin', short: 'BTC' },
  { symbol: 'BINANCE:ETHUSDT', name: 'Ethereum', short: 'ETH' },
  { symbol: 'BINANCE:SOLUSDT', name: 'Solana', short: 'SOL' },
  { symbol: 'BINANCE:DOGEUSDT', name: 'Dogecoin', short: 'DOGE' },
  { symbol: 'BINANCE:ADAUSDT', name: 'Cardano', short: 'ADA' },
  { symbol: 'BINANCE:XRPUSDT', name: 'Ripple', short: 'XRP' },
  { symbol: 'BINANCE:DOTUSDT', name: 'Polkadot', short: 'DOT' },
  { symbol: 'BINANCE:AVAXUSDT', name: 'Avalanche', short: 'AVAX' },
  { symbol: 'BINANCE:LINKUSDT', name: 'Chainlink', short: 'LINK' },
  { symbol: 'BINANCE:MATICUSDT', name: 'Polygon', short: 'MATIC' },
];

const stockAssets = [
  { symbol: 'RELIANCE', finnhubSymbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd.' },
  { symbol: 'TCS', finnhubSymbol: 'TCS.NS', name: 'Tata Consultancy Services Ltd.' },
  { symbol: 'HDFCBANK', finnhubSymbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd.' },
  { symbol: 'INFY', finnhubSymbol: 'INFY.NS', name: 'Infosys Ltd.' },
  { symbol: 'ICICIBANK', finnhubSymbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd.' },
  { symbol: 'SBIN', finnhubSymbol: 'SBIN.NS', name: 'State Bank of India' },
  { symbol: 'LT', finnhubSymbol: 'LT.NS', name: 'Larsen & Toubro Ltd.' },
  { symbol: 'ITC', finnhubSymbol: 'ITC.NS', name: 'ITC Ltd.' },
  { symbol: 'AXISBANK', finnhubSymbol: 'AXISBANK.NS', name: 'Axis Bank Ltd.' },
  { symbol: 'KOTAKBANK', finnhubSymbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank Ltd.' },
];

module.exports = {
  cryptoAssets,
  stockAssets,
};
