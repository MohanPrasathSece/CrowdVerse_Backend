const axios = require('axios');

const NSE_BASE = 'https://www.nseindia.com';
const NIFTY_50_ENDPOINT = `${NSE_BASE}/api/equity-stockIndices?index=${encodeURIComponent('NIFTY 50')}`;

const SECTOR_MAP = {
  RELIANCE: 'Energy / Diversified',
  TCS: 'IT Services',
  HDFCBANK: 'Banking',
  ICICIBANK: 'Banking',
  INFY: 'IT Services',
  SBIN: 'Banking',
  LT: 'Infrastructure',
  ITC: 'FMCG / Diversified',
  BHARTIARTL: 'Telecom',
  HINDUNILVR: 'FMCG',
  AXISBANK: 'Banking',
  KOTAKBANK: 'Banking',
  SUNPHARMA: 'Pharmaceuticals',
  ASIANPAINT: 'Consumer / Paints',
  MARUTI: 'Automobile',
  BAJFINANCE: 'Financial Services',
  BAJAJFINSV: 'Financial Services',
  TITAN: 'Consumer / Luxury',
  ULTRACEMCO: 'Cement & Materials',
  NESTLEIND: 'FMCG',
};

const axiosNSE = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    Accept: 'application/json,text/plain,*/*',
    Referer: `${NSE_BASE}/`,
    'Accept-Language': 'en-US,en;q=0.9',
    Connection: 'keep-alive',
  },
  withCredentials: true,
});

async function fetchNifty50() {
  // Warm-up request to set cookies if required by NSE
  try {
    await axiosNSE.get(NSE_BASE, { timeout: 8000 });
  } catch (_) {
    // ignore warm-up failures
  }

  const { data } = await axiosNSE.get(NIFTY_50_ENDPOINT);

  // Normalize payload. NSE responses may vary slightly; handle common shapes safely.
  const stocks = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.stocks)
      ? data.stocks
      : Array.isArray(data)
        ? data
        : [];

  const mapped = stocks.map((s) => {
    const symbol = (s?.symbol || s?.symbolName || '').toString().trim().toUpperCase();
    const name = (s?.symbol || s?.identifier || symbol).toString();

    // NSE may provide lastPrice like '2,345.65'
    const parseNum = (v) => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'number') return v;
      const num = parseFloat(String(v).replace(/,/g, ''));
      return Number.isFinite(num) ? num : null;
    };

    const price = parseNum(s?.lastPrice ?? s?.last ?? s?.ltp);
    const open = parseNum(s?.open);
    const high = parseNum(s?.dayHigh ?? s?.high);
    const low = parseNum(s?.dayLow ?? s?.low);
    const prevClose = parseNum(s?.previousClose ?? s?.prevClose);

    let change = null;
    if (typeof s?.pChange === 'number') change = s.pChange;
    else if (s?.pChange) change = parseNum(s.pChange);
    else if (price != null && prevClose != null) change = ((price - prevClose) / prevClose) * 100;

    const marketCap = parseNum(s?.marketCap || s?.mktCap || s?.market_Capitalization);
    const weightage = parseNum(s?.weightage || s?.indexWeight); // NSE may expose index weight
    const sector = SECTOR_MAP[symbol] || (s?.industry ? String(s.industry) : null);

    return {
      symbol,
      name,
      price,
      open,
      high,
      low,
      prevClose,
      change,
      marketCap,
      weightage,
      sector,
    };
  });

  return mapped;
}

module.exports = { fetchNifty50 };
