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
  { symbol: 'RELIANCE', moneycontrolSlug: 'RI', name: 'Reliance Industries Ltd.' },
  { symbol: 'TCS', moneycontrolSlug: 'TC', name: 'Tata Consultancy Services Ltd.' },
  { symbol: 'HDFCBANK', moneycontrolSlug: 'HDF', name: 'HDFC Bank Ltd.' },
  { symbol: 'INFY', moneycontrolSlug: 'IT', name: 'Infosys Ltd.' },
  { symbol: 'ICICIBANK', moneycontrolSlug: 'ICB', name: 'ICICI Bank Ltd.' },
  { symbol: 'SBIN', moneycontrolSlug: 'SBI', name: 'State Bank of India' },
  { symbol: 'LT', moneycontrolSlug: 'LT', name: 'Larsen & Toubro Ltd.' },
  { symbol: 'ITC', moneycontrolSlug: 'ITC', name: 'ITC Ltd.' },
  { symbol: 'AXISBANK', moneycontrolSlug: 'AR31', name: 'Axis Bank Ltd.' },
  { symbol: 'KOTAKBANK', moneycontrolSlug: 'KB', name: 'Kotak Mahindra Bank Ltd.' },
];

module.exports = {
  cryptoAssets,
  stockAssets,
};
