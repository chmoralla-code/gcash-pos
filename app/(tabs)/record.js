import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, formatCurrency } from '../../src/constants';
import { addTransaction, calculateFee, getFeeSettings } from '../../src/database';
import { createBackup } from '../../src/backupService';

export default function RecordSaleScreen() {
  const router = useRouter();
  const [type, setType] = useState('cashin');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Fee tiers info for display
  const [feeTiers, setFeeTiers] = useState({ cashin: [], cashout: [] });

  useFocusEffect(
    useCallback(() => {
      loadFeeTiers();
    }, [])
  );

  const loadFeeTiers = async () => {
    const cashin = await getFeeSettings('cashin');
    const cashout = await getFeeSettings('cashout');
    setFeeTiers({ cashin, cashout });
  };

  const handleAmountChange = async (text) => {
    // Only allow numbers and decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    setAmount(cleaned);

    if (cleaned && parseFloat(cleaned) > 0) {
      const calculatedFee = await calculateFee(type, parseFloat(cleaned));
      setFee(calculatedFee);
    } else {
      setFee(0);
    }
  };

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000, 10000, 20000];

  const handleQuickAmount = async (val) => {
    setAmount(String(val));
    const calculatedFee = await calculateFee(type, val);
    setFee(calculatedFee);
  };

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    setLoading(true);
    try {
      const finalFee = await calculateFee(type, parsedAmount);
      await addTransaction(type, parsedAmount, finalFee);
      await createBackup(); // Auto-backup after each transaction

      Alert.alert(
        'Success!',
        `${type === 'cashin' ? 'Cash In' : 'Cash Out'} recorded\nAmount: ${formatCurrency(parsedAmount)}\nFee: ${formatCurrency(finalFee)}`,
        [{ text: 'OK', onPress: () => { setAmount(''); setFee(0); setNote(''); } }]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to save transaction.');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Transaction Type Selector */}
        <Text style={styles.label}>Transaction Type</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'cashin' && styles.typeBtnActiveCashin]}
            onPress={async () => {
              setType('cashin');
              if (amount) {
                const f = await calculateFee('cashin', parseFloat(amount));
                setFee(f);
              }
            }}
          >
            <Ionicons
              name="arrow-down-circle"
              size={24}
              color={type === 'cashin' ? '#fff' : COLORS.cashin}
            />
            <Text style={[styles.typeBtnText, type === 'cashin' && styles.typeBtnTextActive]}>
              Cash In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'cashout' && styles.typeBtnActiveCashout]}
            onPress={async () => {
              setType('cashout');
              if (amount) {
                const f = await calculateFee('cashout', parseFloat(amount));
                setFee(f);
              }
            }}
          >
            <Ionicons
              name="arrow-up-circle"
              size={24}
              color={type === 'cashout' ? '#fff' : COLORS.cashout}
            />
            <Text style={[styles.typeBtnText, type === 'cashout' && styles.typeBtnTextActive]}>
              Cash Out
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySign}>₱</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor={COLORS.textLight}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={handleAmountChange}
          />
        </View>

        {/* Quick Amount Selector */}
        <View style={styles.quickAmounts}>
          {quickAmounts.map((val) => (
            <TouchableOpacity
              key={val}
              style={[
                styles.quickAmountBtn,
                amount === String(val) && styles.quickAmountBtnActive,
              ]}
              onPress={() => handleQuickAmount(val)}
            >
              <Text style={[
                styles.quickAmountText,
                amount === String(val) && styles.quickAmountTextActive,
              ]}>
                {formatCurrency(val)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Calculated Fee Display */}
        <View style={styles.feeCard}>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Amount:</Text>
            <Text style={styles.feeValue}>{amount ? formatCurrency(parseFloat(amount)) : '₱0.00'}</Text>
          </View>
          <View style={styles.feeDivider} />
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Fee:</Text>
            <Text style={[styles.feeValue, { color: COLORS.accent }]}>{formatCurrency(fee)}</Text>
          </View>
          <View style={styles.feeDivider} />
          <View style={styles.feeRow}>
            <Text style={[styles.feeLabel, { fontWeight: 'bold' }]}>
              {type === 'cashin' ? 'Customer Pays:' : 'Customer Receives:'}
            </Text>
            <Text style={[styles.feeValue, { fontWeight: 'bold', color: COLORS.primary }]}>
              {amount
                ? type === 'cashin'
                  ? formatCurrency(parseFloat(amount) + fee)
                  : formatCurrency(parseFloat(amount) - fee)
                : '₱0.00'}
            </Text>
          </View>
        </View>

        {/* Fee Tier Reference */}
        {feeTiers[type]?.length > 0 && (
          <View style={styles.feeTierRef}>
            <Text style={styles.feeTierTitle}>Current Fee Tiers:</Text>
            {feeTiers[type].map((tier) => (
              <Text key={tier.id} style={styles.feeTierText}>
                ₱{tier.min_amount.toLocaleString()}
                {tier.max_amount ? ` - ₱${tier.max_amount.toLocaleString()}` : '+'}
                {' → Fee: '}₱{tier.fee_amount.toLocaleString()}
              </Text>
            ))}
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: type === 'cashin' ? COLORS.cashin : COLORS.cashout }]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.submitBtnText}>
            {loading ? 'Saving...' : `Record ${type === 'cashin' ? 'Cash In' : 'Cash Out'}`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  typeBtnActiveCashin: {
    backgroundColor: COLORS.cashin,
    borderColor: COLORS.cashin,
  },
  typeBtnActiveCashout: {
    backgroundColor: COLORS.cashout,
    borderColor: COLORS.cashout,
  },
  typeBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: '#fff',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  currencySign: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    paddingVertical: 16,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  quickAmountBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickAmountBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  quickAmountText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  quickAmountTextActive: {
    color: COLORS.primary,
  },
  feeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  feeLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  feeValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  feeDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 2,
  },
  feeTierRef: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  feeTierTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 6,
  },
  feeTierText: {
    fontSize: 13,
    color: COLORS.primaryDark,
    lineHeight: 20,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 18,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
