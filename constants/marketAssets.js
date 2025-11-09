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
  { symbol: 'RELIANCE', twelvedataSymbol: 'RELIANCE.NSE', name: 'Reliance Industries Ltd.' },
  { symbol: 'TCS', twelvedataSymbol: 'TCS.NSE', name: 'Tata Consultancy Services Ltd.' },
  { symbol: 'HDFCBANK', twelvedataSymbol: 'HDFCBANK.NSE', name: 'HDFC Bank Ltd.' },
  { symbol: 'INFY', twelvedataSymbol: 'INFY.NSE', name: 'Infosys Ltd.' },
  { symbol: 'ICICIBANK', twelvedataSymbol: 'ICICIBANK.NSE', name: 'ICICI Bank Ltd.' },
  { symbol: 'SBIN', twelvedataSymbol: 'SBIN.NSE', name: 'State Bank of India' },
  { symbol: 'LT', twelvedataSymbol: 'LT.NSE', name: 'Larsen & Toubro Ltd.' },
  { symbol: 'ITC', twelvedataSymbol: 'ITC.NSE', name: 'ITC Ltd.' },
  { symbol: 'AXISBANK', twelvedataSymbol: 'AXISBANK.NSE', name: 'Axis Bank Ltd.' },
  { symbol: 'KOTAKBANK', twelvedataSymbol: 'KOTAKBANK.NSE', name: 'Kotak Mahindra Bank Ltd.' },
];

module.exports = {
  cryptoAssets,
  stockAssets,
};
