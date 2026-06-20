import { mockDb } from 'expo-sqlite';

import {
  initDatabase,
  addFeeSetting, getFeeSettings,
  addTransaction, getTodayTransactions, getAllTransactions, clearTodayTransactions,
  getIncomeSummary,
  getUnsyncedTransactions, markTransactionsSynced,
  getTelegramSettings, updateTelegramSettings, updateLastSentDate,
  getAppSetting, setAppSetting,
  exportAllData, importAllData,
} from '../src/database';

beforeEach(async () => {
  Object.keys(mockDb._tables).forEach(k => delete mockDb._tables[k]);
  await initDatabase();
});

describe('Database Edge Cases', () => {
  test('clearTodayTransactions removes all', async () => {
    await addTransaction('cashin', 1000, 50);
    await clearTodayTransactions();
    const today = await getTodayTransactions();
    expect(today.length).toBe(0);
  });

  test('getAllTransactions returns inserted entries', async () => {
    await addTransaction('cashin', 1000, 50);
    await addTransaction('cashout', 500, 25);
    const all = await getAllTransactions();
    expect(all.length).toBe(2);
  });

  test('telegram settings roundtrip', async () => {
    const s = await getTelegramSettings();
    expect(s).not.toBeNull();
    await updateTelegramSettings('token123', 'chat456', true);
    const saved = await getTelegramSettings();
    expect(saved.bot_token).toBe('token123');
    expect(saved.chat_id).toBe('chat456');
  });

  test('updateLastSentDate persists', async () => {
    await updateTelegramSettings('tok', 'cid', true);
    const date = '2024-01-15';
    await updateLastSentDate(date);
    const settings = await getTelegramSettings();
    expect(settings.last_sent_date).toBe(date);
  });

  test('app settings roundtrip', async () => {
    await setAppSetting('theme', 'dark');
    const v = await getAppSetting('theme');
    expect(v).toBe('dark');
    const missing = await getAppSetting('nonexistent');
    expect(missing).toBeNull();
  });

  test('exportAllData returns structured object', async () => {
    await addTransaction('cashin', 1000, 50);
    const data = await exportAllData();
    expect(data).toHaveProperty('transactions');
    expect(data).toHaveProperty('feeSettings');
    expect(data).toHaveProperty('appSettings');
    expect(data.transactions.length).toBeGreaterThanOrEqual(1);
  });

  test('importAllData restores state', async () => {
    await addTransaction('cashin', 1000, 50);
    const exported = await exportAllData();
    Object.keys(mockDb._tables).forEach(k => delete mockDb._tables[k]);
    await initDatabase();
    await importAllData(exported);
    const transactions = await getAllTransactions();
    expect(transactions.length).toBe(1);
  });

  test('unsynced transactions tracked and markable', async () => {
    const id = await addTransaction('cashin', 1000, 50);
    const unsynced = await getUnsyncedTransactions();
    expect(unsynced.length).toBeGreaterThanOrEqual(1);
    const syncId = unsynced[0].sync_id;
    await markTransactionsSynced([syncId]);
    const after = await getUnsyncedTransactions();
    expect(after.length).toBe(0);
  });

  test('income summary returns structured object', async () => {
    await addTransaction('cashin', 1000, 50);
    await addTransaction('cashout', 500, 25);
    const s = await getIncomeSummary('today');
    expect(s).toHaveProperty('cashin');
    expect(s).toHaveProperty('cashout');
    expect(s).toHaveProperty('totalFee');
    expect(s.cashin.count).toBeGreaterThanOrEqual(1);
    expect(s.cashout.count).toBeGreaterThanOrEqual(1);
  });

  test('fee settings crud', async () => {
    const id = await addFeeSetting(0, 1000, 10);
    expect(id).toBeGreaterThan(0);
    const fees = await getFeeSettings();
    expect(fees.length).toBe(1);
    expect(fees[0].fee_amount).toBe(10);
  });
});
