import { GoldPriceSnapshot, Karat, KARATS } from './types';
import { parseGoldSaPrices, pricePerGramForKarat } from './gold';

export const GOLD_SA_URL = 'https://gold.sa/en';

/**
 * Fallback per-gram SAR prices, used when the live scrape is unavailable
 * (offline, blocked, or markup changed). Kept intentionally conservative;
 * a successful scrape always overrides these.
 */
export const FALLBACK_PRICE_PER_GRAM: Record<Karat, number> = {
  24: 300,
  22: 275,
  21: 262,
  18: 225,
};

function buildSnapshot(
  partial: Partial<Record<Karat, number>>,
  source: string,
): GoldPriceSnapshot {
  const base = partial[24];
  const pricePerGram = KARATS.reduce((acc, karat) => {
    if (partial[karat] != null) {
      acc[karat] = partial[karat] as number;
    } else if (base != null) {
      acc[karat] = pricePerGramForKarat(base, karat);
    } else {
      acc[karat] = FALLBACK_PRICE_PER_GRAM[karat];
    }
    return acc;
  }, {} as Record<Karat, number>);

  return { fetchedAt: new Date().toISOString(), pricePerGram, source };
}

/** A snapshot built entirely from the bundled fallback prices. */
export function fallbackSnapshot(): GoldPriceSnapshot {
  return buildSnapshot(FALLBACK_PRICE_PER_GRAM, 'fallback');
}

/**
 * Fetch the current gold prices from gold.sa and parse them into a snapshot.
 * Falls back to bundled defaults if the request fails or nothing parses.
 */
export async function fetchGoldPrices(): Promise<GoldPriceSnapshot> {
  try {
    const response = await fetch(GOLD_SA_URL, {
      headers: {
        // A browser-like UA is required; gold.sa rejects bare clients.
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en',
      },
    });
    if (!response.ok) {
      throw new Error(`gold.sa responded ${response.status}`);
    }
    const html = await response.text();
    const parsed = parseGoldSaPrices(html);
    if (Object.keys(parsed).length === 0) {
      throw new Error('no prices parsed from gold.sa');
    }
    return buildSnapshot(parsed, GOLD_SA_URL);
  } catch (err) {
    console.warn('fetchGoldPrices failed, using fallback:', err);
    return fallbackSnapshot();
  }
}
