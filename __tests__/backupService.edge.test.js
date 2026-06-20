import { initDatabase, addTransaction } from '../src/database';
import { createBackup, restoreFromBackup, getBackupTimestamp, shareBackup, restoreLatestBackup, autoBackup } from '../src/backupService';
import * as FileSystem from 'expo-file-system';

beforeEach(async () => {
  await initDatabase();
  FileSystem.__reset();
});

describe('Backup Service Edge Cases', () => {
  test('shareBackup succeeds when sharing available', async () => {
    await addTransaction('cashin', 1000, 50);
    const r = await shareBackup();
    expect(r.success).toBe(true);
  });

  test('restoreLatestBackup returns error with no backups', async () => {
    const r = await restoreLatestBackup();
    expect(r.success).toBe(false);
  });

  test('restoreLatestBackup restores latest after createBackup', async () => {
    await addTransaction('cashin', 500, 25);
    await createBackup();
    const r = await restoreLatestBackup();
    expect(r.success).toBe(true);
  });

  test('getBackupTimestamp returns a date after createBackup', async () => {
    await addTransaction('cashin', 1000, 50);
    await createBackup();
    const ts = await getBackupTimestamp();
    expect(ts).not.toBeNull();
    expect(typeof ts).toBe('string');
    expect(ts.length).toBeGreaterThan(0);
  });

  test('autoBackup succeeds', async () => {
    await addTransaction('cashin', 1000, 50);
    const r = await autoBackup();
    expect(r.success).toBe(true);
  });

  test('ensureBackupDir is idempotent', async () => {
    const { ensureBackupDir } = require('../src/backupService');
    await ensureBackupDir();
    await expect(ensureBackupDir()).resolves.not.toThrow();
  });
});
