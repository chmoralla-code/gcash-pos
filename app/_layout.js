import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { initDatabase, getTelegramSettings } from '../src/database';
import { createBackup } from '../src/backupService';
import { sendDailySummary } from '../src/telegramService';

export default function RootLayout() {
  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();

        // Auto-backup on app start
        await createBackup();

        // Auto-send Telegram summary if enabled and online
        const tgSettings = await getTelegramSettings();
        if (tgSettings?.auto_send && tgSettings?.bot_token && tgSettings?.chat_id) {
          // Fire and forget - don't block app startup
          sendDailySummary().catch(() => {});
        }
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
