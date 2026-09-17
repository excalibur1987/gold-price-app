export type Karat = 24 | 22 | 21 | 18;

export const KARATS: Karat[] = [24, 22, 21, 18];

/** A single gold purchase made by the user. */
export interface GoldEntry {
  id: string;
  /** Weight of gold purchased, in grams. */
  grams: number;
  karat: Karat;
  /** Purchase date as an ISO calendar date, e.g. "2024-01-31". */
  purchaseDate: string;
  /** SAR paid per gram (for the entry's karat) at purchase time. */
  purchasePricePerGram: number;
}

/** A snapshot of gold prices scraped from gold.sa, cached locally. */
export interface GoldPriceSnapshot {
  /** When the snapshot was fetched (ISO date-time). */
  fetchedAt: string;
  /** SAR price per gram, keyed by karat. */
  pricePerGram: Record<Karat, number>;
  source: string;
}

export interface EntryValuation {
  cost: number;
  currentValue: number;
  profit: number;
  profitPercent: number;
}

export interface PortfolioSummary {
  totalGrams: number;
  totalCost: number;
  totalValue: number;
  totalProfit: number;
  profitPercent: number;
}
