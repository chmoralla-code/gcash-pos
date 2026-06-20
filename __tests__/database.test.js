import { mockDb } from 'expo-sqlite';

import {
  initDatabase, getDb,
  getFeeSettings, addFeeSetting, updateFeeSetting, deleteFeeSetting, calculateFee,
  addTransaction, getUnsyncedTransactions, markTransactionsSynced,
  getIncomeSummary,
  getAllTransactions, deleteTransaction,
  getBestDay, searchTransactions, mergeRemoteTransactions,
  transactionsToCSV, importTransactionsFromCSV,
  getTelegramSettings, updateTelegramSettings, updateLastSentDate,
  getAppSetting, setAppSetting,
  exportAllData, importAllData,
  getAllTransactionsForExport,
} from '../src/database';

beforeEach(async () => {
  Object.keys(mockDb._tables).forEach(k => delete mockDb._tables[k]);
  await initDatabase();
});

test('initDatabase creates db', async () => {
  expect(getDb()).toBeTruthy();
});

describe('Fee Settings', () => {
  test('add and list fees', async () => {
    const id = await addFeeSetting(0, 1000, 10);
    expect(id).toBeGreaterThan(0);
    const fees = await getFeeSettings();
    expect(fees.length).toBe(1);
  });

  test('update and delete fee', async () => {
    const id = await addFeeSetting(0, 100, 5);
    await updateFeeSetting(id, 0, 200, 8);
    let fees = await getFeeSettings();
    expect(fees.find(f => f.id === id).fee_amount).toBe(8);
    await deleteFeeSetting(id);
    fees = await getFeeSettings();
    expect(fees.find(f => f.id === id)).toBeUndefined();
  });

  test('calculateFee matches rules', async () => {
    await addFeeSetting(0, 1000, 10);
    await addFeeSetting(1001, null, 25);
    expect(await calculateFee(500)).toBe(10);
    expect(await calculateFee(1500)).toBe(25);
    expect(await calculateFee(99999)).toBe(25);
  });
});

describe('Transactions', () => {
  test('add and list', async () => {
    const r = await addTransaction('cashin', 1000, 10);
    expect(r.sync_id).toContain('sync_');
    await addTransaction('cashout', 50, 3);
    expect((await getAllTransactions()).length).toBe(2);
  });

  test('unsynced and mark synced', async () => {
    const { sync_id } = await addTransaction('cashin', 200, 10);
    expect((await getUnsyncedTransactions()).length).toBe(1);
    await markTransactionsSynced([sync_id]);
    expect((await getUnsyncedTransactions()).length).toBe(0);
  });

  test('delete transaction', async () => {
    const { id } = await addTransaction('cashin', 100, 5);
    await deleteTransaction(id);
    expect((await getAllTransactions()).length).toBe(0);
  });

  test('search by type', async () => {
    await addTransaction('cashin', 500, 25);
    await addTransaction('cashout', 300, 10);
    const r = await searchTransactions('cashin');
    expect(r.every(t => t.type === 'cashin')).toBe(true);
  });
});

describe('Income Summary', () => {
  test('groups by type', async () => {
    await addTransaction('cashin', 1000, 50);
    await addTransaction('cashin', 2000, 100);
    await addTransaction('cashout', 500, 25);
    const s = await getIncomeSummary('today');
    expect(s.cashin.count).toBe(2);
    expect(s.cashout.count).toBe(1);
    expect(s.totalFee).toBe(175);
  });
});

describe('CSV', () => {
  test('export and import', async () => {
    await addTransaction('cashin', 1000, 50);
    const csv = transactionsToCSV(await getAllTransactions());
    expect(csv).toContain('Cash In');
    const r = await importTransactionsFromCSV(csv);
    expect(r.success).toBe(true);
  });

  test('rejects bad CSV', async () => {
    expect((await importTransactionsFromCSV('Type,Amount,Fee')).success).toBe(false);
    expect((await importTransactionsFromCSV('X,Y\n1,2')).success).toBe(false);
  });
});

describe('Settings', () => {
  test('telegram settings', async () => {
    expect((await getTelegramSettings()).bot_token).toBeDefined();
    await updateTelegramSettings('b', 'c', true);
    expect((await getTelegramSettings()).bot_token).toBe('b');
    await updateLastSentDate('2024-01-15');
    expect((await getTelegramSettings()).last_sent_date).toBe('2024-01-15');
  });

  test('app settings roundtrip', async () => {
    await setAppSetting('key1', 'val1');
    expect(await getAppSetting('key1')).toBe('val1');
    expect(await getAppSetting('nope')).toBeNull();
  });
});

describe('Export/Import', () => {
  test('exportAllData', async () => {
    await addTransaction('cashin', 500, 25);
    const data = await exportAllData();
    expect(data.version).toBe('1.0');
    expect(data.transactions.length).toBe(1);
  });

  test('importAllData restores', async () => {
    await importAllData({
      transactions: [{ id: 1, type: 'cashin', amount: 1000, fee: 50, created_at: '2024-01-15' }],
      feeSettings: [],
    });
    expect((await getAllTransactions()).length).toBe(1);
  });
});

describe('Merge & Best Day', () => {
  test('merge inserts and skips duplicates', async () => {
    expect(await mergeRemoteTransactions([{ sync_id: 's1', type: 'cashin', amount: 100, fee: 5 }])).toBe(1);
    expect(await mergeRemoteTransactions([{ sync_id: 's1', type: 'cashin', amount: 100, fee: 5 }])).toBe(0);
  });

  test('getBestDay returns data', async () => {
    await addTransaction('cashin', 500, 25);
    expect(await getBestDay()).toBeTruthy();
  });

  test('getAllTransactionsForExport', async () => {
    await addTransaction('cashin', 100, 5);
    expect((await getAllTransactionsForExport('today')).length).toBeGreaterThan(0);
  });
});
