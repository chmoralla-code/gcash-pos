import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { ThemeProvider, useTheme } from '../src/ThemeContext';
import { initDatabase, getTelegramSettings, getAppSetting } from '../src/database';
import { createBackup } from '../src/backupService';
import { sendDailySummary } from '../src/telegramService';
import PinScreen from '../src/PinScreen';

async function setupNotifications() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    // Cancel existing and schedule end-of-day reminder
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule at 8 PM daily
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 End of Day',
        body: 'Don\'t forget to check today\'s sales total!',
      },
      trigger: { hour: 20, minute: 0, repeats: true },
    });
  } catch (e) { /* optional */ }
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
  const [pinRequired, setPinRequired] = useState(null); // null=loading, true/false

  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();
        await createBackup();
        await setupNotifications();

        const pin = await getAppSetting('appPin');
        setPinRequired(!!pin);

        const tgSettings = await getTelegramSettings();
        if (tgSettings?.auto_send && tgSettings?.bot_token && tgSettings?.chat_id) {
          sendDailySummary().catch(() => {});
        }
      } catch (e) {
        console.error('Setup error:', e);
      }
      setReady(true);
    }
    setup();
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
