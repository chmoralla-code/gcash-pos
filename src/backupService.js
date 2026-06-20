import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { exportAllData, importAllData } from './database';

const BACKUP_DIR = `${FileSystem.documentDirectory}backups/`;
const BACKUP_FILE = `${BACKUP_DIR}gcash_pos_backup.json`;

export async function ensureBackupDir() {
  const dirInfo = await FileSystem.getInfoAsync(BACKUP_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
  }
}

export async function createBackup() {
  try {
    await ensureBackupDir();
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    await FileSystem.writeAsStringAsync(BACKUP_FILE, json);
    return { success: true, path: BACKUP_FILE };
  } catch (error) {
    console.error('Backup error:', error);
    return { success: false, error: error.message };
  }
}

export async function restoreFromBackup(filePath) {
  try {
    const json = await FileSystem.readAsStringAsync(filePath);
    const data = JSON.parse(json);
    await importAllData(data);
    return { success: true };
  } catch (error) {
    console.error('Restore error:', error);
    return { success: false, error: error.message };
  }
}

export async function shareBackup() {
  try {
    const result = await createBackup();
    if (!result.success) return result;

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, error: 'Sharing is not available on this device' };
    }

    await Sharing.shareAsync(result.path, {
      mimeType: 'application/json',
      dialogTitle: 'Share CyCash Backup',
    });
    return { success: true };
  } catch (error) {
    console.error('Share backup error:', error);
    return { success: false, error: error.message };
  }
}

export async function restoreLatestBackup() {
  try {
    // Document picking is more complex in Expo; for simplicity,
    // we'll look for the latest backup in the backups directory
    await ensureBackupDir();
    const files = await FileSystem.readDirectoryAsync(BACKUP_DIR);

    // Filter for backup files
    const backupFiles = files.filter(f => f.endsWith('.json')).sort().reverse();

    if (backupFiles.length === 0) {
      return { success: false, error: 'No backup files found' };
    }

    const latestBackup = `${BACKUP_DIR}${backupFiles[0]}`;
    return await restoreFromBackup(latestBackup);
  } catch (error) {
    console.error('Pick and restore error:', error);
    return { success: false, error: error.message };
  }
}

export async function getBackupTimestamp() {
  try {
    const info = await FileSystem.getInfoAsync(BACKUP_FILE);
    if (info.exists) {
      return info.modificationTime
        ? new Date(info.modificationTime * 1000).toLocaleString('en-PH')
        : 'Unknown';
    }
    return null;
  } catch {
    return null;
  }
}

export async function autoBackup() {
  // Called periodically to ensure data is backed up
  return await createBackup();
}
