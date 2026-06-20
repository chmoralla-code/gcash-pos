import * as SQLite from 'expo-sqlite';

let db = null;

export async function initDatabase() {
  db = await SQLite.openDatabaseAsync('gcash_pos.db');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS fee_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT DEFAULT 'all',
      min_amount REAL NOT NULL,
      max_amount REAL,
      fee_amount REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      fee REAL NOT NULL,
      sync_id TEXT UNIQUE,
      sync_status INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS telegram_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_token TEXT DEFAULT '',
      chat_id TEXT DEFAULT '',
      auto_send INTEGER DEFAULT 1,
      last_sent_date TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Migrate: add sync_id and sync_status for existing DBs
  try { await db.execAsync("ALTER TABLE transactions ADD COLUMN sync_id TEXT"); } catch (e) {}
  try { await db.execAsync("ALTER TABLE transactions ADD COLUMN sync_status INTEGER DEFAULT 0"); } catch (e) {}

  const tgRows = await db.getAllAsync('SELECT id FROM telegram_settings WHERE id = 1');
  if (tgRows.length === 0) {
    await db.runAsync(
      'INSERT INTO telegram_settings (id, bot_token, chat_id, auto_send, last_sent_date) VALUES (1, ?, ?, 1, ?)',
      '', '', ''
    );
  }

  return db;
}

export function getDb() { return db; }

// ─── Fee Settings (single list for both cashin & cashout) ─────

export async function getFeeSettings() {
  if (!db) await initDatabase();
  return await db.getAllAsync('SELECT * FROM fee_settings ORDER BY min_amount ASC');
}

export async function addFeeSetting(minAmount, maxAmount, feeAmount) {
  if (!db) await initDatabase();
  const result = await db.runAsync(
    'INSERT INTO fee_settings (type, min_amount, max_amount, fee_amount) VALUES (?, ?, ?, ?)',
    'all', minAmount, maxAmount || null, feeAmount
  );
  return result.lastInsertRowId;
}

export async function updateFeeSetting(id, minAmount, maxAmount, feeAmount) {
  if (!db) await initDatabase();
  await db.runAsync(
    'UPDATE fee_settings SET min_amount = ?, max_amount = ?, fee_amount = ? WHERE id = ?',
    minAmount, maxAmount || null, feeAmount, id
  );
}

export async function deleteFeeSetting(id) {
  if (!db) await initDatabase();
  await db.runAsync('DELETE FROM fee_settings WHERE id = ?', id);
}

export async function calculateFee(amount) {
  if (!db) await initDatabase();
  const rows = await db.getAllAsync(
    'SELECT fee_amount FROM fee_settings WHERE min_amount <= ? AND (max_amount IS NULL OR max_amount >= ?) ORDER BY min_amount DESC LIMIT 1',
    amount, amount
  );
  return rows.length > 0 ? rows[0].fee_amount : 0;
}

// ─── Transactions ─────────────────────────────────────────────

function generateSyncId() {
  return 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
}

export async function addTransaction(type, amount, fee) {
  if (!db) await initDatabase();
  const syncId = generateSyncId();
  const result = await db.runAsync(
    'INSERT INTO transactions (type, amount, fee, sync_id, sync_status) VALUES (?, ?, ?, ?, ?)',
    type, amount, fee, syncId, 0
  );
  return { id: result.lastInsertRowId, sync_id: syncId };
}

export async function getUnsyncedTransactions() {
  if (!db) await initDatabase();
  return await db.getAllAsync('SELECT * FROM transactions WHERE sync_status = 0 ORDER BY created_at DESC');
}

export async function markTransactionsSynced(syncIds) {
  if (!db) await initDatabase();
  for (const sid of syncIds) {
    await db.runAsync('UPDATE transactions SET sync_status = 1 WHERE sync_id = ?', sid);
  }
}

export async function mergeRemoteTransactions(remote) {
  if (!db) await initDatabase();
  let count = 0;
  for (const t of remote) {
    const existing = await db.getAllAsync('SELECT id FROM transactions WHERE sync_id = ?', t.sync_id);
    if (existing.length === 0 && t.type && t.amount) {
      await db.runAsync(
        'INSERT INTO transactions (type, amount, fee, sync_id, sync_status, created_at) VALUES (?, ?, ?, ?, 1, ?)',
        t.type, t.amount, t.fee || 0, t.sync_id, t.created_at || new Date().toISOString()
      );
      count++;
    }
  }
  return count;
}

export async function getTodayTransactions() {
  if (!db) await initDatabase();
  return await db.getAllAsync(
    "SELECT * FROM transactions WHERE date(created_at) = date('now','localtime') ORDER BY created_at DESC"
  );
}

export async function getTransactionsByPeriod(period) {
  if (!db) await initDatabase();
  let w = '';
  switch (period) {
    case 'today': w = "date(created_at) = date('now','localtime')"; break;
    case 'yesterday': w = "date(created_at) = date('now','localtime','-1 day')"; break;
    case '15days': w = "created_at >= datetime('now','localtime','-15 days')"; break;
    case 'monthly': w = "strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now','localtime')"; break;
    case 'yearly': w = "strftime('%Y', created_at) = strftime('%Y', 'now','localtime')"; break;
    default: w = "date(created_at) = date('now','localtime')";
  }
  return await db.getAllAsync(`SELECT * FROM transactions WHERE ${w} ORDER BY created_at DESC`);
}

export async function getIncomeSummary(period) {
  if (!db) await initDatabase();
  let w = '';
  switch (period) {
    case 'today': w = "date(created_at) = date('now','localtime')"; break;
    case 'yesterday': w = "date(created_at) = date('now','localtime','-1 day')"; break;
    case '15days': w = "created_at >= datetime('now','localtime','-15 days')"; break;
    case 'monthly': w = "strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now','localtime')"; break;
    case 'yearly': w = "strftime('%Y', created_at) = strftime('%Y', 'now','localtime')"; break;
    default: w = "date(created_at) = date('now','localtime')";
  }

  const rows = await db.getAllAsync(
    `SELECT type, COUNT(*) as count, COALESCE(SUM(amount),0) as total_amount, COALESCE(SUM(fee),0) as total_fee
     FROM transactions WHERE ${w} GROUP BY type`
  );

  const s = { cashin: { count: 0, amount: 0, fee: 0 }, cashout: { count: 0, amount: 0, fee: 0 }, totalFee: 0 };
  for (const r of rows) {
    if (r.type === 'cashin') s.cashin = { count: r.count, amount: r.total_amount, fee: r.total_fee };
    else if (r.type === 'cashout') s.cashout = { count: r.count, amount: r.total_amount, fee: r.total_fee };
  }
  s.totalFee = s.cashin.fee + s.cashout.fee;
  return s;
}

export async function getAllTransactions() {
  if (!db) await initDatabase();
  return await db.getAllAsync('SELECT * FROM transactions ORDER BY created_at DESC');
}

export async function deleteTransaction(id) {
  if (!db) await initDatabase();
  await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
}

export async function clearTodayTransactions() {
  if (!db) await initDatabase();
  await db.execAsync("DELETE FROM transactions WHERE date(created_at) = date('now','localtime')");
}

export async function getBestDay() {
  if (!db) await initDatabase();
  const rows = await db.getAllAsync(
    "SELECT date(created_at) as day, SUM(fee) as total_fee, COUNT(*) as count FROM transactions GROUP BY day ORDER BY total_fee DESC LIMIT 1"
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function importTransactionsFromCSV(csvText) {
  if (!db) await initDatabase();
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return { success: false, error: 'No data rows' };
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const typeIdx = headers.indexOf('type');
  const amountIdx = headers.indexOf('amount');
  const feeIdx = headers.indexOf('fee');
  const dateIdx = headers.indexOf('date & time') > -1 ? headers.indexOf('date & time') : headers.indexOf('date');
  
  if (typeIdx === -1 || amountIdx === -1) return { success: false, error: 'Invalid CSV format' };
  
  let imported = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const type = (cols[typeIdx] || '').trim().toLowerCase().includes('cash in') ? 'cashin' : 'cashout';
    const amount = parseFloat(cols[amountIdx]);
    const fee = feeIdx > -1 ? parseFloat(cols[feeIdx]) || 0 : 0;
    const created_at = dateIdx > -1 && cols[dateIdx] ? cols[dateIdx].trim() : null;
    
    if (isNaN(amount) || amount <= 0) continue;
    
    if (created_at) {
      await db.runAsync('INSERT INTO transactions (type, amount, fee, created_at) VALUES (?, ?, ?, ?)', type, amount, fee, created_at);
    } else {
      await db.runAsync('INSERT INTO transactions (type, amount, fee) VALUES (?, ?, ?)', type, amount, fee);
    }
    imported++;
  }
  return { success: true, count: imported };
}

// ─── Telegram Settings ────────────────────────────────────────

export async function getTelegramSettings() {
  if (!db) await initDatabase();
  const r = await db.getAllAsync('SELECT * FROM telegram_settings WHERE id = 1');
  if (r.length === 0) {
    await db.runAsync('INSERT INTO telegram_settings (id, bot_token, chat_id, auto_send, last_sent_date) VALUES (1, ?, ?, 1, ?)', '', '', '');
    return { id: 1, bot_token: '', chat_id: '', auto_send: 1, last_sent_date: '' };
  }
  return r[0];
}

export async function updateTelegramSettings(botToken, chatId, autoSend) {
  if (!db) await initDatabase();
  await db.runAsync('UPDATE telegram_settings SET bot_token=?, chat_id=?, auto_send=? WHERE id=1', botToken, chatId, autoSend ? 1 : 0);
}

export async function updateLastSentDate(dateStr) {
  if (!db) await initDatabase();
  await db.runAsync('UPDATE telegram_settings SET last_sent_date=? WHERE id=1', dateStr);
}

// ─── App Settings ─────────────────────────────────────────────

export async function getAppSetting(key) {
  if (!db) await initDatabase();
  const r = await db.getAllAsync('SELECT value FROM app_settings WHERE key = ?', key);
  return r.length > 0 ? r[0].value : null;
}

export async function setAppSetting(key, value) {
  if (!db) await initDatabase();
  await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', key, String(value));
}

// ─── Transactions search ──────────────────────────────────────

export async function searchTransactions(query) {
  if (!db) await initDatabase();
  const q = `%${query}%`;
  return await db.getAllAsync(
    `SELECT * FROM transactions
     WHERE type LIKE ? OR CAST(amount AS TEXT) LIKE ? OR CAST(fee AS TEXT) LIKE ? OR created_at LIKE ?
     ORDER BY created_at DESC LIMIT 100`,
    q, q, q, q
  );
}

// ─── CSV Export ───────────────────────────────────────────────

export async function getAllTransactionsForExport(period) {
  if (!db) await initDatabase();
  let w = '';
  switch (period) {
    case 'today': w = "date(created_at) = date('now','localtime')"; break;
    case 'yesterday': w = "date(created_at) = date('now','localtime','-1 day')"; break;
    case '15days': w = "created_at >= datetime('now','localtime','-15 days')"; break;
    case 'monthly': w = "strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now','localtime')"; break;
    case 'yearly': w = "strftime('%Y', created_at) = strftime('%Y', 'now','localtime')"; break;
    default: w = "1=1";
  }
  return await db.getAllAsync(`SELECT * FROM transactions WHERE ${w} ORDER BY created_at DESC`);
}

export function transactionsToCSV(txns) {
  const header = 'ID,Type,Amount,Fee,Date & Time\n';
  const rows = txns.map(t =>
    `${t.id},${t.type === 'cashin' ? 'Cash In' : 'Cash Out'},${t.amount},${t.fee},${t.created_at}`
  ).join('\n');
  return header + rows;
}

// ─── Backup / Export ──────────────────────────────────────────

export async function exportAllData() {
  if (!db) await initDatabase();
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    transactions: await db.getAllAsync('SELECT * FROM transactions ORDER BY created_at DESC'),
    feeSettings: await db.getAllAsync('SELECT * FROM fee_settings'),
    telegramSettings: await getTelegramSettings(),
    appSettings: await db.getAllAsync('SELECT * FROM app_settings'),
  };
}

export async function importAllData(data) {
  if (!db) await initDatabase();
  await db.execAsync('DELETE FROM transactions');
  await db.execAsync('DELETE FROM fee_settings');
  if (data.transactions?.length) {
    for (const t of data.transactions) {
      await db.runAsync('INSERT OR REPLACE INTO transactions (id, type, amount, fee, created_at) VALUES (?,?,?,?,?)',
        t.id, t.type, t.amount, t.fee, t.created_at);
    }
  }
  if (data.feeSettings?.length) {
    for (const f of data.feeSettings) {
      await db.runAsync('INSERT OR REPLACE INTO fee_settings (id, type, min_amount, max_amount, fee_amount, created_at) VALUES (?,?,?,?,?,?)',
        f.id, f.type, f.min_amount, f.max_amount, f.fee_amount, f.created_at);
    }
  }
}
