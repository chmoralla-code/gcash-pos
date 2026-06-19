import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeProvider, useTheme } from '../src/ThemeContext';
import { initDatabase, getTelegramSettings, getAppSetting } from '../src/database';
import { createBackup } from '../src/backupService';
import { sendDailySummary } from '../src/telegramService';
import PinScreen from '../src/PinScreen';

async function setupNotifications() {
  try {
    const Notifications = require('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title: '📊 End of Day', body: 'Check today\'s sales total!' },
      trigger: { hour: 20, minute: 0, repeats: true },
    });
  } catch (e) { /* notifications optional */ }
}

function AppContent({ children }) {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </>
  );
}

function RootLayoutInner() {
  const [ready, setReady] = useState(false);
  const [pinRequired, setPinRequired] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function setup() {
      try {
        await initDatabase();
        await createBackup();
        setupNotifications().catch(() => {});
        const pin = await getAppSetting('appPin');
        if (mounted) setPinRequired(!!pin);
        const tgSettings = await getTelegramSettings();
        if (tgSettings?.auto_send && tgSettings?.bot_token && tgSettings?.chat_id) {
          sendDailySummary().catch(() => {});
        }
      } catch (e) {
        console.error('Setup error:', e);
      }
      if (mounted) setReady(true);
    }
    setup();
    return () => { mounted = false; };
  }, []);

  if (!ready) {
    return (
      <View style={splashStyles.container}>
        <Text style={splashStyles.title}>GCash POS</Text>
        <Text style={splashStyles.sub}>Loading...</Text>
      </View>
    );
  }

  if (pinRequired) {
    return <PinScreen onUnlock={() => setPinRequired(false)} />;
  }

  return (
    <AppContent>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AppContent>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}

const splashStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0078D4', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
});
