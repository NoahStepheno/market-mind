export interface MockStock {
  symbol: string;
  name: string;
  basePrice: number;
  volatility: number;
  baseVolume: number;
}

export const MOCK_STOCKS: MockStock[] = [
  {
    symbol: "000001.SZ",
    name: "平安银行",
    basePrice: 12.5,
    volatility: 0.02,
    baseVolume: 50_000_000,
  },
  { symbol: "000002.SZ", name: "万科A", basePrice: 8.3, volatility: 0.025, baseVolume: 80_000_000 },
  {
    symbol: "600519.SH",
    name: "贵州茅台",
    basePrice: 1750.0,
    volatility: 0.015,
    baseVolume: 3_000_000,
  },
  {
    symbol: "600036.SH",
    name: "招商银行",
    basePrice: 35.2,
    volatility: 0.018,
    baseVolume: 40_000_000,
  },
  {
    symbol: "000858.SZ",
    name: "五粮液",
    basePrice: 145.0,
    volatility: 0.02,
    baseVolume: 8_000_000,
  },
  {
    symbol: "601318.SH",
    name: "中国平安",
    basePrice: 48.5,
    volatility: 0.018,
    baseVolume: 30_000_000,
  },
  {
    symbol: "000333.SZ",
    name: "美的集团",
    basePrice: 62.0,
    volatility: 0.02,
    baseVolume: 15_000_000,
  },
  {
    symbol: "600900.SH",
    name: "长江电力",
    basePrice: 28.5,
    volatility: 0.01,
    baseVolume: 20_000_000,
  },
];
