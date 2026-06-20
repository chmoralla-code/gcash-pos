import { initDatabase, addTransaction } from '../src/database';
import { ensureBackupDir, createBackup, restoreFromBackup, getBackupTimestamp, autoBackup } from '../src/backupService';
import * as FileSystem from 'expo-file-system';

beforeEach(async () => {
  await initDatabase();
  FileSystem.__reset();
});

describe('Backup Service', () => {
  test('createBackup with data', async () => {
    await addTransaction('cashin', 1000, 50);
    const r = await createBackup();
    expect(r.success).toBe(true);
    expect(r.path).toContain('backups/gcash_pos_backup.json');
  });

  test('autoBackup succeeds', async () => {
    expect((await autoBackup()).success).toBe(true);
  });

  test('restoreFromBackup fails on bad JSON', async () => {
    FileSystem._files['/mock/documents/backups/bad.json'] = '{invalid}';
    const r = await restoreFromBackup('/mock/documents/backups/bad.json');
    expect(r.success).toBe(false);
  });

  test('ensureBackupDir creates directory', async () => {
    await ensureBackupDir();
    expect((await FileSystem.getInfoAsync('/mock/documents/backups/')).exists).toBe(true);
  });

  test('getBackupTimestamp without backup file', async () => {
    FileSystem.__reset();
    const ts = await getBackupTimestamp();
    expect(ts).toBeNull();
  });
});
