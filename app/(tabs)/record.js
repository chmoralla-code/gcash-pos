import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../src/constants';
import { useTheme } from '../../src/ThemeContext';
import { addTransaction, calculateFee, getFeeSettings } from '../../src/database';
import { createBackup } from '../../src/backupService';

export default function RecordSaleScreen() {
  const { colors: C } = useTheme();
  const [type, setType] = useState('cashin');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState(0);
  const [loading, setLoading] = useState(false);
  const [feeTiers, setFeeTiers] = useState([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const tiers = await getFeeSettings();
      setFeeTiers(tiers.sort((a, b) => a.min_amount - b.min_amount));
    })();
  }, []));

  const playSound = async () => {
    try {
      const { createAudioPlayer } = require('expo-audio');
      const player = createAudioPlayer({ uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' });
      player.play();
    } catch (e) { /* sound optional */ }
  };

  const handleAmountChange = async (text) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    setAmount(cleaned);
    if (cleaned && parseFloat(cleaned) > 0) {
      const f = await calculateFee(parseFloat(cleaned));
      setFee(f);
    } else {
      setFee(0);
    }
  };

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000, 10000, 20000];

  const handleQuickAmount = async (val) => {
    setAmount(String(val));
    setFee(await calculateFee(val));
  };

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Enter a valid amount.');
      return;
    }
    setLoading(true);
    try {
      const finalFee = await calculateFee(parsedAmount);
      await addTransaction(type, parsedAmount, finalFee);
      await createBackup();
      playSound();
      Alert.alert(
        '✓ Recorded!',
        `${type === 'cashin' ? 'Cash In' : 'Cash Out'}\nAmount: ${formatCurrency(parsedAmount)}\nFee: ${formatCurrency(finalFee)}`,
        [{ text: 'OK', onPress: () => { setAmount(''); setFee(0); } }]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to save.');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: C.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Type Selector */}
        <Text style={[styles.label, { color: C.text }]}>Transaction Type</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeBtn, { borderColor: C.border, backgroundColor: C.surface }, type === 'cashin' && { backgroundColor: C.cashin, borderColor: C.cashin }]}
            onPress={async () => { setType('cashin'); if (amount) setFee(await calculateFee(parseFloat(amount))); }}
          >
            <Ionicons name="arrow-down-circle" size={24} color={type === 'cashin' ? '#fff' : C.cashin} />
            <Text style={[styles.typeBtnText, { color: type === 'cashin' ? '#fff' : C.text }]}>Cash In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, { borderColor: C.border, backgroundColor: C.surface }, type === 'cashout' && { backgroundColor: C.cashout, borderColor: C.cashout }]}
            onPress={async () => { setType('cashout'); if (amount) setFee(await calculateFee(parseFloat(amount))); }}
          >
            <Ionicons name="arrow-up-circle" size={24} color={type === 'cashout' ? '#fff' : C.cashout} />
            <Text style={[styles.typeBtnText, { color: type === 'cashout' ? '#fff' : C.text }]}>Cash Out</Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <Text style={[styles.label, { color: C.text }]}>Amount</Text>
        <View style={[styles.amountInputContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.currencySign, { color: C.text }]}>₱</Text>
          <TextInput
            style={[styles.amountInput, { color: C.text }]}
            placeholder="0.00"
            placeholderTextColor={C.textLight}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={handleAmountChange}
          />
        </View>

        {/* Quick Amounts */}
        <View style={styles.quickAmounts}>
          {quickAmounts.map((val) => (
            <TouchableOpacity key={val} style={[styles.quickAmountBtn, { backgroundColor: C.surface, borderColor: C.border }, amount === String(val) && { backgroundColor: C.primaryLight, borderColor: C.primary }]}
              onPress={() => handleQuickAmount(val)}>
              <Text style={[styles.quickAmountText, { color: C.textSecondary }, amount === String(val) && { color: C.primary }]}>{formatCurrency(val)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fee Breakdown */}
        <View style={[styles.feeCard, { backgroundColor: C.surface }]}>
          <View style={styles.feeRow}>
            <Text style={[styles.feeLabel, { color: C.textSecondary }]}>Amount:</Text>
            <Text style={[styles.feeValue, { color: C.text }]}>{amount ? formatCurrency(parseFloat(amount)) : '₱0.00'}</Text>
          </View>
          <View style={[styles.feeDivider, { backgroundColor: C.border }]} />
          <View style={styles.feeRow}>
            <Text style={[styles.feeLabel, { color: C.textSecondary }]}>Fee:</Text>
            <Text style={[styles.feeValue, { color: C.accent }]}>{formatCurrency(fee)}</Text>
          </View>
          <View style={[styles.feeDivider, { backgroundColor: C.border }]} />
          <View style={styles.feeRow}>
            <Text style={[styles.feeLabel, { fontWeight: 'bold', color: C.textSecondary }]}>
              {type === 'cashin' ? 'Customer Pays:' : 'Customer Receives:'}
            </Text>
            <Text style={[styles.feeValue, { fontWeight: 'bold', color: C.primary }]}>
              {amount ? (type === 'cashin' ? formatCurrency(parseFloat(amount) + fee) : formatCurrency(parseFloat(amount) - fee)) : '₱0.00'}
            </Text>
          </View>
        </View>

        {/* Fee Tiers Reference */}
        {feeTiers.length > 0 && (
          <View style={[styles.feeTierRef, { backgroundColor: C.primaryLight }]}>
            <Text style={[styles.feeTierTitle, { color: C.primary }]}>Fee Tiers:</Text>
            {feeTiers.map((tier) => (
              <Text key={tier.id} style={[styles.feeTierText, { color: C.primaryDark }]}>
                ₱{tier.min_amount.toLocaleString()}+ → Fee: ₱{tier.fee_amount.toLocaleString()}
              </Text>
            ))}
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: type === 'cashin' ? C.cashin : C.cashout }]}
          onPress={handleSubmit} disabled={loading} activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.submitBtnText}>{loading ? 'Saving...' : `Record ${type === 'cashin' ? 'Cash In' : 'Cash Out'}`}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  typeSelector: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, borderWidth: 2 },
  typeBtnText: { fontSize: 16, fontWeight: '600' },
  amountInputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 2, paddingHorizontal: 16, marginBottom: 12 },
  currencySign: { fontSize: 28, fontWeight: 'bold', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: 'bold', paddingVertical: 16 },
  quickAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  quickAmountBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  quickAmountText: { fontSize: 13, fontWeight: '500' },
  feeCard: { borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  feeLabel: { fontSize: 15 },
  feeValue: { fontSize: 15, fontWeight: '600' },
  feeDivider: { height: 1, marginVertical: 2 },
  feeTierRef: { borderRadius: 10, padding: 14, marginBottom: 16 },
  feeTierTitle: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  feeTierText: { fontSize: 13, lineHeight: 20 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 18, borderRadius: 12, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
