import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Switch } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/ThemeContext';
import { getTelegramSettings, updateTelegramSettings } from '../../src/database';
import { sendDailySummary, testTelegramConnection } from '../../src/telegramService';

export default function TelegramSettingsScreen() {
  const { colors: C } = useTheme();
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [autoSend, setAutoSend] = useState(true);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);

  const loadSettings = useCallback(async () => {
    const s = await getTelegramSettings();
    setBotToken(s.bot_token || '');
    setChatId(s.chat_id || '');
    setAutoSend(s.auto_send === 1);
  }, []);

  useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

  const handleSave = async () => { await updateTelegramSettings(botToken.trim(), chatId.trim(), autoSend); Alert.alert('Saved', 'Settings saved.'); };

  const handleTest = async () => {
    if (!botToken.trim() || !chatId.trim()) { Alert.alert('Missing', 'Enter Bot Token and Chat ID.'); return; }
    setTesting(true);
    const ok = await testTelegramConnection(botToken.trim(), chatId.trim());
    setTesting(false);
    if (ok) { Alert.alert('Success', 'Test message sent!'); await handleSave(); }
    else Alert.alert('Failed', 'Check your Bot Token and Chat ID.');
  };

  const handleSendNow = async () => {
    setSending(true);
    const r = await sendDailySummary(true);
    setSending(false);
    if (r.success) Alert.alert('Sent!', 'Summary sent.');
    else Alert.alert('Error', r.error || 'Failed.');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: C.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.banner, { backgroundColor: '#E8F4FD' }]}>
        <Ionicons name="paper-plane" size={24} color="#0088cc" />
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Telegram Monitoring</Text>
          <Text style={styles.bannerDesc}>Get daily sales summaries sent to your Telegram.</Text>
        </View>
      </View>

      <Text style={[styles.label, { color: C.text }]}>Bot Token</Text>
      <Text style={[styles.hint, { color: C.textLight }]}>From @BotFather on Telegram. Format: 123456:ABC-DEF1234...</Text>
      <TextInput style={[styles.input, { backgroundColor: C.surface, color: C.text, borderColor: C.border }]}
        placeholder="Enter your bot token" placeholderTextColor={C.textLight}
        value={botToken} onChangeText={setBotToken} autoCapitalize="none" autoCorrect={false} secureTextEntry />

      <Text style={[styles.label, { color: C.text }]}>Chat ID</Text>
      <Text style={[styles.hint, { color: C.textLight }]}>Your Telegram chat/user ID. Use @userinfobot to get yours.</Text>
      <TextInput style={[styles.input, { backgroundColor: C.surface, color: C.text, borderColor: C.border }]}
        placeholder="e.g. 123456789" placeholderTextColor={C.textLight}
        value={chatId} onChangeText={setChatId} keyboardType="numeric" />

      <View style={[styles.switchRow, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={styles.switchInfo}>
          <Ionicons name="notifications" size={20} color={C.primary} />
          <View>
            <Text style={[styles.switchLabel, { color: C.text }]}>Auto Send Daily Summary</Text>
            <Text style={[styles.switchDesc, { color: C.textLight }]}>Sends today's total when you open the app</Text>
          </View>
        </View>
        <Switch value={autoSend} onValueChange={setAutoSend} trackColor={{ false: C.border, true: C.primaryLight }} thumbColor={autoSend ? C.primary : '#f4f3f4'} />
      </View>

      {/* Guide */}
      <View style={[styles.guide, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[styles.guideTitle, { color: C.text }]}>How to Set Up</Text>
        {[
          'Open Telegram → search @BotFather',
          'Send /newbot and follow instructions',
          'Copy the token BotFather gives you',
          'Search @userinfobot, send /start to get Chat ID',
          'Send /start to your bot so it can message you',
        ].map((s, i) => (
          <View key={i} style={styles.guideStep}>
            <View style={[styles.guideNum, { backgroundColor: C.primary }]}><Text style={styles.guideNumText}>{i + 1}</Text></View>
            <Text style={[styles.guideText, { color: C.textSecondary }]}>{s}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={[styles.btn, { backgroundColor: '#0088cc' }]} onPress={handleTest} disabled={testing}>
        <Ionicons name="flash" size={18} color="#fff" /><Text style={styles.btnText}>{testing ? 'Testing...' : 'Test Connection'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, { backgroundColor: C.secondary }]} onPress={handleSendNow} disabled={sending}>
        <Ionicons name="paper-plane" size={18} color="#fff" /><Text style={styles.btnText}>{sending ? 'Sending...' : 'Send Summary Now'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, { backgroundColor: C.primary }]} onPress={handleSave}>
        <Ionicons name="save" size={18} color="#fff" /><Text style={styles.btnText}>Save Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 100 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 12, padding: 16, marginBottom: 20 },
  bannerTitle: { fontSize: 16, fontWeight: 'bold', color: '#0088cc' },
  bannerDesc: { fontSize: 13, color: '#005a8c', marginTop: 2 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  hint: { fontSize: 12, marginBottom: 8, lineHeight: 16 },
  input: { borderRadius: 10, padding: 14, fontSize: 15, borderWidth: 1, marginBottom: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1 },
  switchInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  switchLabel: { fontSize: 14, fontWeight: '600' },
  switchDesc: { fontSize: 11, marginTop: 2 },
  guide: { borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1 },
  guideTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 14 },
  guideStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  guideNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  guideNumText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  guideText: { flex: 1, fontSize: 13, lineHeight: 20 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, marginBottom: 10 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
