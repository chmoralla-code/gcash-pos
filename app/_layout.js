import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { initDatabase } from '../src/database';
import { createBackup } from '../src/backupService';
import { COLORS } from '../src/constants';

export default function RootLayout() {
  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();
        // Auto-backup on app start
        await createBackup();
      } catch (e) {
        console.error('Setup error:', e);
      }
    }
    setup();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
