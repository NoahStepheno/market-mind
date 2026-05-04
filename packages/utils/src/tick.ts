export interface Tick {
  symbol: string;
  price: number;
  pctChange: number;
  volume: number;
  turnover: number;
  limitUp: boolean;
  limitDown: boolean;
  volumeRatio5m: number;
  priceChange5m: number;
  timestamp: string;
}

export interface DerivedMetrics {
  symbol: string;
  vwap: number;
  avgVolume5m: number;
  priceStdDev5m: number;
  timestamp: string;
}
