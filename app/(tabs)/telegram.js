import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants';
import { getTelegramSettings, updateTelegramSettings } from '../../src/database';
import { sendDailySummary, testTelegramConnection } from '../../src/telegramService';

export default function TelegramSettingsScreen() {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [autoSend, setAutoSend] = useState(true);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);

  const loadSettings = useCallback(async () => {
    const settings = await getTelegramSettings();
    setBotToken(settings.bot_token || '');
    setChatId(settings.chat_id || '');
    setAutoSend(settings.auto_send === 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const handleSave = async () => {
    await updateTelegramSettings(botToken.trim(), chatId.trim(), autoSend);
    Alert.alert('Saved', 'Telegram settings have been saved.');
  };

  const handleTest = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      Alert.alert('Missing', 'Please enter both Bot Token and Chat ID.');
      return;
    }
    setTesting(true);
    const success = await testTelegramConnection(botToken.trim(), chatId.trim());
    setTesting(false);
    if (success) {
      Alert.alert('Success', 'Connection successful! Check your Telegram for the test message.');
      await handleSave();
    } else {
      Alert.alert('Failed', 'Could not send test message. Check your Bot Token and Chat ID.');
    }
  };

  const handleSendNow = async () => {
    setSending(true);
    const result = await sendDailySummary(true);
    setSending(false);
    if (result.success) {
      Alert.alert('Sent!', 'Daily summary has been sent to Telegram.');
    } else {
      Alert.alert('Error', result.error || 'Failed to send. Check your settings.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <View style={styles.infoBanner}>
        <Ionicons name="paper-plane" size={24} color="#0088cc" />
        <View style={styles.infoBannerText}>
          <Text style={styles.infoBannerTitle}>Telegram Monitoring</Text>
          <Text style={styles.infoBannerDesc}>
            Get daily sales summaries sent directly to your Telegram.
          </Text>
        </View>
      </View>

      {/* Bot Token */}
      <Text style={styles.label}>Bot Token</Text>
      <Text style={styles.hint}>
        Get this from @BotFather on Telegram. Format: 123456:ABC-DEF1234ghIkl...
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your Telegram bot token"
        placeholderTextColor={COLORS.textLight}
        value={botToken}
        onChangeText={setBotToken}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />

      {/* Chat ID */}
      <Text style={styles.label}>Chat ID</Text>
      <Text style={styles.hint}>
        Your Telegram chat/user ID. Send a message to @userinfobot to get yours.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your chat ID (e.g., 123456789)"
        placeholderTextColor={COLORS.textLight}
        value={chatId}
        onChangeText={setChatId}
        keyboardType="numeric"
      />

      {/* Auto Send Toggle */}
      <View style={styles.switchRow}>
        <View style={styles.switchInfo}>
          <Ionicons name="notifications" size={20} color={COLORS.primary} />
          <View>
            <Text style={styles.switchLabel}>Auto Send Daily Summary</Text>
            <Text style={styles.switchDesc}>
              Automatically sends today's total income when you open the app
            </Text>
          </View>
        </View>
        <Switch
          value={autoSend}
          onValueChange={setAutoSend}
          trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
          thumbColor={autoSend ? COLORS.primary : '#f4f3f4'}
        />
      </View>

      {/* How to Setup Guide */}
      <View style={styles.guideCard}>
        <Text style={styles.guideTitle}>📋 How to Set Up</Text>
        <View style={styles.guideStep}>
          <Text style={styles.guideStepNum}>1</Text>
          <Text style={styles.guideStepText}>
            Open Telegram and search for <Text style={styles.guideBold}>@BotFather</Text>
          </Text>
        </View>
        <View style={styles.guideStep}>
          <Text style={styles.guideStepNum}>2</Text>
          <Text style={styles.guideStepText}>
            Send <Text style={styles.guideBold}>/newbot</Text> and follow the instructions to create a new bot
          </Text>
        </View>
        <View style={styles.guideStep}>
          <Text style={styles.guideStepNum}>3</Text>
          <Text style={styles.guideStepText}>
            Copy the <Text style={styles.guideBold}>token</Text> BotFather gives you and paste it above
          </Text>
        </View>
        <View style={styles.guideStep}>
          <Text style={styles.guideStepNum}>4</Text>
          <Text style={styles.guideStepText}>
            Search for <Text style={styles.guideBold}>@userinfobot</Text> on Telegram and send <Text style={styles.guideBold}>/start</Text> to get your Chat ID
          </Text>
        </View>
        <View style={styles.guideStep}>
          <Text style={styles.guideStepNum}>5</Text>
          <Text style={styles.guideStepText}>
            Start a chat with your bot and send <Text style={styles.guideBold}>/start</Text> so it can message you
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <TouchableOpacity
        style={styles.testBtn}
        onPress={handleTest}
        disabled={testing}
      >
        <Ionicons name="flash" size={20} color="#fff" />
        <Text style={styles.testBtnText}>
          {testing ? 'Testing...' : 'Test Connection'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.sendBtn}
        onPress={handleSendNow}
        disabled={sending}
      >
        <Ionicons name="paper-plane" size={20} color="#fff" />
        <Text style={styles.sendBtnText}>
          {sending ? 'Sending...' : 'Send Daily Summary Now'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Ionicons name="save" size={20} color="#fff" />
        <Text style={styles.saveBtnText}>Save Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoBannerText: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0088cc',
  },
  infoBannerDesc: {
    fontSize: 13,
    color: '#005a8c',
    marginTop: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 8,
    lineHeight: 16,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  switchDesc: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  guideCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 14,
  },
  guideStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  guideStepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 22,
    overflow: 'hidden',
  },
  guideStepText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  guideBold: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0088cc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  testBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
