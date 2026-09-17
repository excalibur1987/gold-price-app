import {
  entryCost,
  entryCurrentValue,
  parseGoldSaPrices,
  pricePerGramForKarat,
  purity,
  summarizePortfolio,
  valuateEntry,
} from '../src/gold';
import { GoldEntry, GoldPriceSnapshot } from '../src/types';

const snapshot: GoldPriceSnapshot = {
  fetchedAt: '2024-06-01T00:00:00.000Z',
  source: 'test',
  pricePerGram: { 24: 300, 22: 275, 21: 262.5, 18: 225 },
};

describe('purity & karat pricing', () => {
  it('computes fractional purity', () => {
    expect(purity(24)).toBe(1);
    expect(purity(18)).toBe(0.75);
  });

  it('derives per-karat price from 24K price', () => {
    expect(pricePerGramForKarat(300, 24)).toBe(300);
    expect(pricePerGramForKarat(300, 18)).toBe(225);
    expect(pricePerGramForKarat(300, 21)).toBeCloseTo(262.5, 5);
  });
});

describe('entry valuation', () => {
  const entry: GoldEntry = {
    id: '1',
    grams: 10,
    karat: 21,
    purchaseDate: '2024-01-01',
    purchasePricePerGram: 200,
  };

  it('computes cost and current value', () => {
    expect(entryCost(entry)).toBe(2000);
    expect(entryCurrentValue(entry, snapshot)).toBe(2625);
  });

  it('computes profit and profit percent', () => {
    const v = valuateEntry(entry, snapshot);
    expect(v.profit).toBe(625);
    expect(v.profitPercent).toBeCloseTo(31.25, 5);
  });

  it('handles zero-cost entries without dividing by zero', () => {
    const free: GoldEntry = { ...entry, purchasePricePerGram: 0 };
    expect(valuateEntry(free, snapshot).profitPercent).toBe(0);
  });
});

describe('portfolio summary', () => {
  it('aggregates multiple entries', () => {
    const entries: GoldEntry[] = [
      {
        id: '1',
        grams: 10,
        karat: 24,
        purchaseDate: '2024-01-01',
        purchasePricePerGram: 250,
      },
      {
        id: '2',
        grams: 5,
        karat: 18,
        purchaseDate: '2024-02-01',
        purchasePricePerGram: 200,
      },
    ];
    const s = summarizePortfolio(entries, snapshot);
    expect(s.totalGrams).toBe(15);
    expect(s.totalCost).toBe(3500); // 2500 + 1000
    expect(s.totalValue).toBe(4125); // 3000 + 1125
    expect(s.totalProfit).toBe(625);
    expect(s.profitPercent).toBeCloseTo(17.86, 1);
  });

  it('returns zeros for an empty portfolio', () => {
    const s = summarizePortfolio([], snapshot);
    expect(s.totalCost).toBe(0);
    expect(s.totalProfit).toBe(0);
    expect(s.profitPercent).toBe(0);
  });
});

describe('gold.sa price parsing', () => {
  const sampleHtml = `
    <html><body>
      <table class="prices">
        <tr><th>Karat</th><th>SAR / gram</th></tr>
        <tr><td>24 Karat</td><td>312.50</td></tr>
        <tr><td>22K</td><td>286.40</td></tr>
        <tr><td>21 Karat</td><td>273.10</td></tr>
        <tr><td>18K</td><td>234.20</td></tr>
      </table>
    </body></html>`;

  it('extracts per-karat prices from markup', () => {
    const parsed = parseGoldSaPrices(sampleHtml);
    expect(parsed[24]).toBeCloseTo(312.5, 2);
    expect(parsed[22]).toBeCloseTo(286.4, 2);
    expect(parsed[21]).toBeCloseTo(273.1, 2);
    expect(parsed[18]).toBeCloseTo(234.2, 2);
  });

  it('handles comma thousands separators', () => {
    const parsed = parseGoldSaPrices('<div>24 Karat: 1,234.50 SAR</div>');
    expect(parsed[24]).toBeCloseTo(1234.5, 2);
  });

  it('returns empty object when nothing matches', () => {
    expect(parseGoldSaPrices('<p>no prices here</p>')).toEqual({});
  });
});
