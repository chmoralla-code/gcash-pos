import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, formatCurrency, formatDateTime } from '../../src/constants';
import { getTodayTransactions, getIncomeSummary, deleteTransaction } from '../../src/database';
import { sendDailySummary } from '../../src/telegramService';

export default function DashboardScreen() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ cashin: { count: 0, amount: 0, fee: 0 }, cashout: { count: 0, amount: 0, fee: 0 }, totalFee: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [txns, sum] = await Promise.all([
        getTodayTransactions(),
        getIncomeSummary('today'),
      ]);
      setTransactions(txns);
      setSummary(sum);
    } catch (e) {
      console.error('Load error:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(id);
            await loadData();
          },
        },
      ]
    );
  };

  const handleSendToTelegram = async () => {
    const result = await sendDailySummary(true);
    if (result.success) {
      Alert.alert('Sent!', 'Today\'s summary has been sent to Telegram.');
    } else {
      Alert.alert('Error', result.error || 'Failed to send. Check Telegram settings.');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Today's Date */}
      <Text style={styles.dateTitle}>
        {new Date().toLocaleDateString('en-PH', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </Text>

      {/* Total Income Card */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Income Today</Text>
        <Text style={styles.totalAmount}>{formatCurrency(summary.totalFee)}</Text>
        <View style={styles.totalRow}>
          <View style={styles.totalItem}>
            <Ionicons name="arrow-down-circle" size={18} color={COLORS.cashin} />
            <Text style={styles.totalItemLabel}>Cash In</Text>
            <Text style={[styles.totalItemValue, { color: COLORS.cashin }]}>
              {formatCurrency(summary.cashin.fee)}
            </Text>
          </View>
          <View style={styles.totalItem}>
            <Ionicons name="arrow-up-circle" size={18} color={COLORS.cashout} />
            <Text style={styles.totalItemLabel}>Cash Out</Text>
            <Text style={[styles.totalItemValue, { color: COLORS.cashout }]}>
              {formatCurrency(summary.cashout.fee)}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: COLORS.cashin }]}>
          <Text style={styles.statLabel}>Cash In</Text>
          <Text style={[styles.statValue, { color: COLORS.cashin }]}>{summary.cashin.count}</Text>
          <Text style={styles.statSub}>{formatCurrency(summary.cashin.amount)}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.cashout }]}>
          <Text style={styles.statLabel}>Cash Out</Text>
          <Text style={[styles.statValue, { color: COLORS.cashout }]}>{summary.cashout.count}</Text>
          <Text style={styles.statSub}>{formatCurrency(summary.cashout.amount)}</Text>
        </View>
      </View>

      {/* Send to Telegram Button */}
      <TouchableOpacity style={styles.telegramBtn} onPress={handleSendToTelegram}>
        <Ionicons name="paper-plane" size={18} color="#fff" />
        <Text style={styles.telegramBtnText}>Send Summary to Telegram</Text>
      </TouchableOpacity>

      {/* Today's Transactions */}
      <Text style={styles.sectionTitle}>Today's Transactions</Text>

      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color={COLORS.textLight} />
          <Text style={styles.emptyText}>No transactions today</Text>
          <Text style={styles.emptySubText}>Go to Record Sale to add one</Text>
        </View>
      ) : (
        transactions.map((txn) => (
          <TouchableOpacity
            key={txn.id}
            style={styles.txnCard}
            onLongPress={() => handleDelete(txn.id)}
            activeOpacity={0.7}
          >
            <View style={styles.txnLeft}>
              <View style={[
                styles.txnIcon,
                { backgroundColor: txn.type === 'cashin' ? COLORS.secondaryLight : COLORS.accentLight },
              ]}>
                <Ionicons
                  name={txn.type === 'cashin' ? 'arrow-down-circle' : 'arrow-up-circle'}
                  size={24}
                  color={txn.type === 'cashin' ? COLORS.cashin : COLORS.cashout}
                />
              </View>
              <View>
                <Text style={styles.txnType}>
                  {txn.type === 'cashin' ? 'Cash In' : 'Cash Out'}
                </Text>
                <Text style={styles.txnTime}>{formatDateTime(txn.created_at)}</Text>
              </View>
            </View>
            <View style={styles.txnRight}>
              <Text style={styles.txnAmount}>{formatCurrency(txn.amount)}</Text>
              <Text style={styles.txnFee}>Fee: {formatCurrency(txn.fee)}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
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
  dateTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  totalCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  totalLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  totalAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  totalItem: {
    alignItems: 'center',
    flex: 1,
  },
  totalItemLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 4,
  },
  totalItemValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  telegramBtn: {
    backgroundColor: '#0088cc',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    elevation: 2,
  },
  telegramBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
  },
  txnCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  txnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txnIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnType: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  txnTime: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  txnRight: {
    alignItems: 'flex-end',
  },
  txnAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  txnFee: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
});
