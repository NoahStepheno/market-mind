import { WebSocketServer } from "ws";

import { MOCK_STOCKS } from "./mock-data.ts";

const PORT = Number(process.env.DATASOURCE_PORT ?? 8080);

const wss = new WebSocketServer({ port: PORT });

const priceState = new Map<string, { price: number; volume: number }>();

for (const stock of MOCK_STOCKS) {
  priceState.set(stock.symbol, { price: stock.basePrice, volume: 0 });
}

function randomWalk(current: number, volatility: number): number {
  const change = current * volatility * (Math.random() - 0.5) * 2;
  const next = current + change;
  return Math.round(Math.max(0.01, next) * 100) / 100;
}

function generateTick(symbol: string) {
  const stock = MOCK_STOCKS.find((s) => s.symbol === symbol);
  if (!stock) throw new Error(`Unknown symbol: ${symbol}`);
  const state = priceState.get(symbol);
  if (!state) throw new Error(`No state for symbol: ${symbol}`);

  const newPrice = randomWalk(state.price, stock.volatility);
  const pctChange = ((newPrice - stock.basePrice) / stock.basePrice) * 100;
  const tickVolume = Math.floor((stock.baseVolume / 240) * (0.5 + Math.random()));
  state.volume += tickVolume;
  if (state.volume > stock.baseVolume * 10) {
    state.volume = 0;
  }
  state.price = newPrice;

  return {
    symbol,
    price: newPrice,
    pctChange: Math.round(pctChange * 100) / 100,
    volume: state.volume,
    turnover: Math.round(state.volume * newPrice),
    limitUp: pctChange >= 9.9,
    limitDown: pctChange <= -9.9,
    volumeRatio5m: Math.round((0.8 + Math.random() * 0.8) * 100) / 100,
    priceChange5m: Math.round(randomWalk(0, stock.volatility) * 100) / 100,
    timestamp: new Date().toISOString(),
  };
}

function broadcastTicks() {
  try {
    const ticks = MOCK_STOCKS.map((stock) => generateTick(stock.symbol));
    const message = JSON.stringify({ type: "ticks", data: ticks });

    for (const client of wss.clients) {
      if (client.readyState === 1) {
        client.send(message);
      }
    }
  } catch (err) {
    console.error("broadcast error:", err);
  }
}

const interval = setInterval(broadcastTicks, 1000);

wss.on("connection", (ws) => {
  console.log(`client connected (total: ${wss.clients.size})`);

  const snapshot = MOCK_STOCKS.map((stock) => generateTick(stock.symbol));
  ws.send(JSON.stringify({ type: "snapshot", data: snapshot }));

  ws.on("close", () => {
    console.log(`client disconnected (total: ${wss.clients.size})`);
  });
});

wss.on("listening", () => {
  console.log(`mock datasource listening on ws://localhost:${PORT}`);
});

function shutdown() {
  clearInterval(interval);
  for (const client of wss.clients) {
    client.close();
  }
  wss.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
