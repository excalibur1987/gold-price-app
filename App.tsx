/**
 * Gold tracker: record gold purchases and see cost, current value and profit
 * using prices scraped from gold.sa (cached locally).
 *
 * @format
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { GoldEntry, Karat, KARATS } from './src/types';
import { summarizePortfolio, valuateEntry } from './src/gold';
import { fetchGoldPrices, fallbackSnapshot } from './src/priceService';
import {
  loadEntries,
  loadSnapshot,
  saveEntries,
  saveSnapshot,
} from './src/storage';

const COLORS = {
  bg: '#0f1115',
  card: '#1b1f27',
  gold: '#e6b800',
  text: '#f5f5f5',
  sub: '#9aa0aa',
  green: '#37c871',
  red: '#ff5c5c',
  border: '#2a2f3a',
};

function money(n: number): string {
  return `${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} SAR`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<GoldEntry[]>([]);
  const [snapshot, setSnapshot] = useState(fallbackSnapshot());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [grams, setGrams] = useState('');
  const [karat, setKarat] = useState<Karat>(24);
  const [date, setDate] = useState(todayISO());
  const [pricePerGram, setPricePerGram] = useState('');

  useEffect(() => {
    (async () => {
      const [storedEntries, storedSnapshot] = await Promise.all([
        loadEntries(),
        loadSnapshot(),
      ]);
      setEntries(storedEntries);
      if (storedSnapshot) {
        setSnapshot(storedSnapshot);
      }
      setLoading(false);
      refreshPrices();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshPrices = useCallback(async () => {
    setRefreshing(true);
    const fresh = await fetchGoldPrices();
    setSnapshot(fresh);
    await saveSnapshot(fresh);
    setRefreshing(false);
  }, []);

  // Prefill the purchase price with the live price for the selected karat.
  useEffect(() => {
    setPricePerGram(String(Math.round(snapshot.pricePerGram[karat])));
  }, [karat, snapshot]);

  const summary = useMemo(
    () => summarizePortfolio(entries, snapshot),
    [entries, snapshot],
  );

  const addEntry = useCallback(async () => {
    const gramsNum = parseFloat(grams);
    const priceNum = parseFloat(pricePerGram);
    if (!gramsNum || gramsNum <= 0) {
      Alert.alert('Invalid amount', 'Enter a gram amount greater than 0.');
      return;
    }
    if (!priceNum || priceNum <= 0) {
      Alert.alert('Invalid price', 'Enter a purchase price greater than 0.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Invalid date', 'Use the format YYYY-MM-DD.');
      return;
    }
    const entry: GoldEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      grams: gramsNum,
      karat,
      purchaseDate: date,
      purchasePricePerGram: priceNum,
    };
    const next = [entry, ...entries];
    setEntries(next);
    await saveEntries(next);
    setGrams('');
    setDate(todayISO());
  }, [grams, pricePerGram, date, karat, entries]);

  const removeEntry = useCallback(
    async (id: string) => {
      const next = entries.filter(e => e.id !== id);
      setEntries(next);
      await saveEntries(next);
    },
    [entries],
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  const profitColor =
    summary.totalProfit >= 0 ? COLORS.green : COLORS.red;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>
        <Text style={{ color: COLORS.gold }}>Gold</Text> Tracker
      </Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <SummaryCell label="Total gold" value={`${summary.totalGrams} g`} />
          <SummaryCell label="Invested" value={money(summary.totalCost)} />
        </View>
        <View style={styles.summaryRow}>
          <SummaryCell label="Today's value" value={money(summary.totalValue)} />
          <SummaryCell
            label="Profit"
            value={`${money(summary.totalProfit)} (${summary.profitPercent}%)`}
            color={profitColor}
          />
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={refreshPrices}
          disabled={refreshing}>
          <Text style={styles.refreshText}>
            {refreshing
              ? 'Refreshing prices…'
              : `24K: ${Math.round(snapshot.pricePerGram[24])} SAR/g · tap to refresh`}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>Add purchase</Text>
        <View style={styles.inputRow}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Grams</Text>
            <TextInput
              style={styles.input}
              value={grams}
              onChangeText={setGrams}
              keyboardType="decimal-pad"
              placeholder="e.g. 10"
              placeholderTextColor={COLORS.sub}
            />
          </View>
          <View style={[styles.flex1, styles.ml8]}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.sub}
              autoCapitalize="none"
            />
          </View>
        </View>

        <Text style={styles.label}>Karat</Text>
        <View style={styles.karatRow}>
          {KARATS.map(k => (
            <TouchableOpacity
              key={k}
              onPress={() => setKarat(k)}
              style={[styles.karatChip, karat === k && styles.karatChipActive]}>
              <Text
                style={[
                  styles.karatChipText,
                  karat === k && styles.karatChipTextActive,
                ]}>
                {k}K
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Purchase price (SAR / gram)</Text>
        <TextInput
          style={styles.input}
          value={pricePerGram}
          onChangeText={setPricePerGram}
          keyboardType="decimal-pad"
          placeholderTextColor={COLORS.sub}
        />

        <TouchableOpacity style={styles.addBtn} onPress={addEntry}>
          <Text style={styles.addBtnText}>Add entry</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.list}
        data={entries}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No purchases yet. Add your first gold entry above.
          </Text>
        }
        renderItem={({ item }) => {
          const v = valuateEntry(item, snapshot);
          const color = v.profit >= 0 ? COLORS.green : COLORS.red;
          return (
            <View style={styles.entry}>
              <View style={styles.flex1}>
                <Text style={styles.entryTitle}>
                  {item.grams} g · {item.karat}K
                </Text>
                <Text style={styles.entrySub}>
                  {item.purchaseDate} · bought @ {item.purchasePricePerGram}{' '}
                  SAR/g
                </Text>
                <Text style={styles.entrySub}>
                  Cost {money(v.cost)} → Now {money(v.currentValue)}
                </Text>
              </View>
              <View style={styles.entryRight}>
                <Text style={[styles.entryProfit, { color }]}>
                  {v.profit >= 0 ? '+' : ''}
                  {money(v.profit)}
                </Text>
                <Text style={[styles.entryPct, { color }]}>
                  {v.profitPercent}%
                </Text>
                <TouchableOpacity onPress={() => removeEntry(item.id)}>
                  <Text style={styles.delete}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

function SummaryCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.flex1}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, color ? { color } : null]}>
        {value}
      </Text>
    </View>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryRow: { flexDirection: 'row', marginBottom: 12 },
  summaryLabel: { color: COLORS.sub, fontSize: 12, marginBottom: 2 },
  summaryValue: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  refreshBtn: {
    marginTop: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#252b36',
    alignItems: 'center',
  },
  refreshText: { color: COLORS.gold, fontSize: 12, fontWeight: '600' },
  form: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  inputRow: { flexDirection: 'row' },
  flex1: { flex: 1 },
  ml8: { marginLeft: 8 },
  label: { color: COLORS.sub, fontSize: 12, marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#12151b',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 15,
  },
  karatRow: { flexDirection: 'row', marginTop: 4 },
  karatChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#12151b',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  karatChipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  karatChipText: { color: COLORS.sub, fontWeight: '700' },
  karatChipTextActive: { color: '#1a1a1a' },
  addBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  addBtnText: { color: '#1a1a1a', fontWeight: '800', fontSize: 15 },
  list: { marginTop: 14, flex: 1 },
  empty: { color: COLORS.sub, textAlign: 'center', marginTop: 24 },
  entry: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  entryTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  entrySub: { color: COLORS.sub, fontSize: 12, marginTop: 3 },
  entryRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  entryProfit: { fontSize: 15, fontWeight: '800' },
  entryPct: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  delete: { color: COLORS.red, fontSize: 12, marginTop: 8 },
});

export default App;
