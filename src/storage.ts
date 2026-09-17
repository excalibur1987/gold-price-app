import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoldEntry, GoldPriceSnapshot } from './types';

const ENTRIES_KEY = '@gold/entries';
const SNAPSHOT_KEY = '@gold/lastSnapshot';

export async function loadEntries(): Promise<GoldEntry[]> {
  const raw = await AsyncStorage.getItem(ENTRIES_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveEntries(entries: GoldEntry[]): Promise<void> {
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export async function loadSnapshot(): Promise<GoldPriceSnapshot | null> {
  const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as GoldPriceSnapshot;
  } catch {
    return null;
  }
}

export async function saveSnapshot(snapshot: GoldPriceSnapshot): Promise<void> {
  await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}
