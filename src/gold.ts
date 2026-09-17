import {
  EntryValuation,
  GoldEntry,
  GoldPriceSnapshot,
  Karat,
  KARATS,
  PortfolioSummary,
} from './types';

/** Fractional purity of a given karat (24K == pure gold). */
export function purity(karat: Karat): number {
  return karat / 24;
}

/**
 * Derive the per-gram price for a karat from the 24K per-gram price.
 * Useful when the source only publishes the pure-gold price.
 */
export function pricePerGramForKarat(
  price24PerGram: number,
  karat: Karat,
): number {
  return price24PerGram * purity(karat);
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Total amount paid for an entry. */
export function entryCost(entry: GoldEntry): number {
  return round2(entry.grams * entry.purchasePricePerGram);
}

/** Current market value of an entry given a price snapshot. */
export function entryCurrentValue(
  entry: GoldEntry,
  snapshot: GoldPriceSnapshot,
): number {
  const perGram = snapshot.pricePerGram[entry.karat];
  return round2(entry.grams * perGram);
}

/** Full valuation (cost, value, profit, profit %) for a single entry. */
export function valuateEntry(
  entry: GoldEntry,
  snapshot: GoldPriceSnapshot,
): EntryValuation {
  const cost = entryCost(entry);
  const currentValue = entryCurrentValue(entry, snapshot);
  const profit = round2(currentValue - cost);
  const profitPercent = cost === 0 ? 0 : round2((profit / cost) * 100);
  return { cost, currentValue, profit, profitPercent };
}

/** Aggregate valuation across all entries. */
export function summarizePortfolio(
  entries: GoldEntry[],
  snapshot: GoldPriceSnapshot,
): PortfolioSummary {
  let totalGrams = 0;
  let totalCost = 0;
  let totalValue = 0;
  for (const entry of entries) {
    const v = valuateEntry(entry, snapshot);
    totalGrams += entry.grams;
    totalCost += v.cost;
    totalValue += v.currentValue;
  }
  const totalProfit = round2(totalValue - totalCost);
  const profitPercent =
    totalCost === 0 ? 0 : round2((totalProfit / totalCost) * 100);
  return {
    totalGrams: round2(totalGrams),
    totalCost: round2(totalCost),
    totalValue: round2(totalValue),
    totalProfit,
    profitPercent,
  };
}

/**
 * Parse per-gram SAR gold prices out of the gold.sa/en markup.
 *
 * The live page renders a price table where each row pairs a karat label
 * (e.g. "24K" / "24 Karat") with a per-gram price. Site markup changes over
 * time, so this scans the stripped text for karat/price pairs rather than
 * relying on brittle CSS selectors. Returns whatever karats it can find.
 */
export function parseGoldSaPrices(html: string): Partial<Record<Karat, number>> {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/,/g, '')
    .replace(/\s+/g, ' ');

  const result: Partial<Record<Karat, number>> = {};
  for (const karat of KARATS) {
    // Match "<karat> K/Karat/Kt ... <price>" allowing intervening words/currency.
    const re = new RegExp(
      `\\b${karat}\\s*(?:k|kt|karat|carat)\\b[^0-9]{0,40}?([0-9]+(?:\\.[0-9]+)?)`,
      'i',
    );
    const match = text.match(re);
    if (match) {
      const value = parseFloat(match[1]);
      if (!Number.isNaN(value) && value > 0) {
        result[karat] = value;
      }
    }
  }
  return result;
}
