import * as SQLite from 'expo-sqlite';

let db = null;

export async function initDatabase() {
  db = await SQLite.openDatabaseAsync('gcash_pos.db');

  // Create tables
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS fee_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
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

  // Ensure default telegram row exists
  const tgRows = await db.getAllAsync('SELECT id FROM telegram_settings WHERE id = 1');
  if (tgRows.length === 0) {
    await db.runAsync(
      'INSERT INTO telegram_settings (id, bot_token, chat_id, auto_send, last_sent_date) VALUES (1, ?, ?, 1, ?)',
      '',
      '',
      ''
    );
  }

  return db;
}

export function getDb() {
  return db;
}

// ─── Fee Settings ─────────────────────────────────────────────

export async function getFeeSettings(type) {
  if (!db) await initDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM fee_settings WHERE type = ? ORDER BY min_amount ASC',
    type
  );
  return rows;
}

export async function getAllFeeSettings() {
  if (!db) await initDatabase();
  return await db.getAllAsync('SELECT * FROM fee_settings ORDER BY type, min_amount ASC');
}

export async function addFeeSetting(type, minAmount, maxAmount, feeAmount) {
  if (!db) await initDatabase();
  const result = await db.runAsync(
    'INSERT INTO fee_settings (type, min_amount, max_amount, fee_amount) VALUES (?, ?, ?, ?)',
    type,
    minAmount,
    maxAmount || null,
    feeAmount
  );
  return result.lastInsertRowId;
}

export async function updateFeeSetting(id, minAmount, maxAmount, feeAmount) {
  if (!db) await initDatabase();
  await db.runAsync(
    'UPDATE fee_settings SET min_amount = ?, max_amount = ?, fee_amount = ? WHERE id = ?',
    minAmount,
    maxAmount || null,
    feeAmount,
    id
  );
}

export async function deleteFeeSetting(id) {
  if (!db) await initDatabase();
  await db.runAsync('DELETE FROM fee_settings WHERE id = ?', id);
}

export async function calculateFee(type, amount) {
  if (!db) await initDatabase();
  const rows = await db.getAllAsync(
    'SELECT fee_amount FROM fee_settings WHERE type = ? AND min_amount <= ? AND (max_amount IS NULL OR max_amount >= ?) ORDER BY min_amount DESC LIMIT 1',
    type,
    amount,
    amount
  );
  return rows.length > 0 ? rows[0].fee_amount : 0;
}

// ─── Transactions ─────────────────────────────────────────────

export async function addTransaction(type, amount, fee) {
  if (!db) await initDatabase();
  const result = await db.runAsync(
    'INSERT INTO transactions (type, amount, fee) VALUES (?, ?, ?)',
    type,
    amount,
    fee
  );
  return result.lastInsertRowId;
}

export async function getTodayTransactions() {
  if (!db) await initDatabase();
  return await db.getAllAsync(
    "SELECT * FROM transactions WHERE date(created_at) = date('now','localtime') ORDER BY created_at DESC"
  );
}

export async function getTransactionsByPeriod(period) {
  if (!db) await initDatabase();
  let whereClause = '';
  switch (period) {
    case 'today':
      whereClause = "date(created_at) = date('now','localtime')";
      break;
    case 'yesterday':
      whereClause = "date(created_at) = date('now','localtime','-1 day')";
      break;
    case '15days':
      whereClause = "created_at >= datetime('now','localtime','-15 days')";
      break;
    case 'monthly':
      whereClause = "strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now','localtime')";
      break;
    case 'yearly':
      whereClause = "strftime('%Y', created_at) = strftime('%Y', 'now','localtime')";
      break;
    default:
      whereClause = "date(created_at) = date('now','localtime')";
  }
  return await db.getAllAsync(
    `SELECT * FROM transactions WHERE ${whereClause} ORDER BY created_at DESC`
  );
}

export async function getIncomeSummary(period) {
  if (!db) await initDatabase();
  let whereClause = '';
  switch (period) {
    case 'today':
      whereClause = "date(created_at) = date('now','localtime')";
      break;
    case 'yesterday':
      whereClause = "date(created_at) = date('now','localtime','-1 day')";
      break;
    case '15days':
      whereClause = "created_at >= datetime('now','localtime','-15 days')";
      break;
    case 'monthly':
      whereClause = "strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now','localtime')";
      break;
    case 'yearly':
      whereClause = "strftime('%Y', created_at) = strftime('%Y', 'now','localtime')";
      break;
    default:
      whereClause = "date(created_at) = date('now','localtime')";
  }

  const rows = await db.getAllAsync(
    `SELECT
       type,
       COUNT(*) as count,
       COALESCE(SUM(amount), 0) as total_amount,
       COALESCE(SUM(fee), 0) as total_fee
     FROM transactions
     WHERE ${whereClause}
     GROUP BY type`
  );

  const summary = { cashin: { count: 0, amount: 0, fee: 0 }, cashout: { count: 0, amount: 0, fee: 0 }, totalFee: 0 };
  for (const row of rows) {
    if (row.type === 'cashin') {
      summary.cashin = { count: row.count, amount: row.total_amount, fee: row.total_fee };
    } else if (row.type === 'cashout') {
      summary.cashout = { count: row.count, amount: row.total_amount, fee: row.total_fee };
    }
  }
  summary.totalFee = summary.cashin.fee + summary.cashout.fee;
  return summary;
}

export async function getAllTransactions() {
  if (!db) await initDatabase();
  return await db.getAllAsync('SELECT * FROM transactions ORDER BY created_at DESC');
}

export async function deleteTransaction(id) {
  if (!db) await initDatabase();
  await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
}

// ─── Telegram Settings ────────────────────────────────────────

export async function getTelegramSettings() {
  if (!db) await initDatabase();
  const rows = await db.getAllAsync('SELECT * FROM telegram_settings WHERE id = 1');
  if (rows.length === 0) {
    await db.runAsync(
      'INSERT INTO telegram_settings (id, bot_token, chat_id, auto_send, last_sent_date) VALUES (1, ?, ?, 1, ?)',
      '',
      '',
      ''
    );
    return { id: 1, bot_token: '', chat_id: '', auto_send: 1, last_sent_date: '' };
  }
  return rows[0];
}

export async function updateTelegramSettings(botToken, chatId, autoSend) {
  if (!db) await initDatabase();
  await db.runAsync(
    'UPDATE telegram_settings SET bot_token = ?, chat_id = ?, auto_send = ? WHERE id = 1',
    botToken,
    chatId,
    autoSend ? 1 : 0
  );
}

export async function updateLastSentDate(dateStr) {
  if (!db) await initDatabase();
  await db.runAsync(
    'UPDATE telegram_settings SET last_sent_date = ? WHERE id = 1',
    dateStr
  );
}

// ─── App Settings ─────────────────────────────────────────────

export async function getAppSetting(key) {
  if (!db) await initDatabase();
  const rows = await db.getAllAsync('SELECT value FROM app_settings WHERE key = ?', key);
  return rows.length > 0 ? rows[0].value : null;
}

export async function setAppSetting(key, value) {
  if (!db) await initDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    key,
    String(value)
  );
}

// ─── Backup / Export ──────────────────────────────────────────

export async function exportAllData() {
  if (!db) await initDatabase();
  const transactions = await db.getAllAsync('SELECT * FROM transactions ORDER BY created_at DESC');
  const feeSettings = await db.getAllAsync('SELECT * FROM fee_settings');
  const tgSettings = await getTelegramSettings();
  const appSettings = await db.getAllAsync('SELECT * FROM app_settings');

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    transactions,
    feeSettings,
    telegramSettings: tgSettings,
    appSettings,
  };
}

export async function importAllData(data) {
  if (!db) await initDatabase();
  // Clear existing data
  await db.execAsync('DELETE FROM transactions');
  await db.execAsync('DELETE FROM fee_settings');

  // Import transactions
  if (data.transactions && data.transactions.length > 0) {
    for (const t of data.transactions) {
      await db.runAsync(
        'INSERT OR REPLACE INTO transactions (id, type, amount, fee, created_at) VALUES (?, ?, ?, ?, ?)',
        t.id, t.type, t.amount, t.fee, t.created_at
      );
    }
  }

  // Import fee settings
  if (data.feeSettings && data.feeSettings.length > 0) {
    for (const f of data.feeSettings) {
      await db.runAsync(
        'INSERT OR REPLACE INTO fee_settings (id, type, min_amount, max_amount, fee_amount, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        f.id, f.type, f.min_amount, f.max_amount, f.fee_amount, f.created_at
      );
    }
  }
}
