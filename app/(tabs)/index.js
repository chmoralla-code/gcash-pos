import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Alert, TextInput,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, formatDateTime } from '../../src/constants';
import { useTheme } from '../../src/ThemeContext';
import {
  getTodayTransactions, getIncomeSummary, deleteTransaction, searchTransactions,
  getAllTransactionsForExport, transactionsToCSV, clearTodayTransactions,
} from '../../src/database';
import { sendDailySummary } from '../../src/telegramService';

const QUICK_CSV_PERIODS = [
  { key: 'today', label: 'Today', icon: 'today' },
  { key: 'yesterday', label: 'Yesterday', icon: 'calendar' },
  { key: 'monthly', label: 'This Month', icon: 'calendar' },
];

export default function DashboardScreen() {
  const { colors: C } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ cashin: { count: 0, amount: 0, fee: 0 }, cashout: { count: 0, amount: 0, fee: 0 }, totalFee: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [phTime, setPhTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setPhTime(now.toLocaleTimeString('en-PH', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Manila' }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [txns, sum] = await Promise.all([getTodayTransactions(), getIncomeSummary('today')]);
      setTransactions(txns);
      setSummary(sum);
    } catch (e) { console.error('Load error:', e); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleDelete = (id) => {
    Alert.alert('Delete', 'Delete this record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteTransaction(id); await loadData(); } },
    ]);
  };

  const handleSearch = async (text) => {
    setSearch(text);
    if (text.trim().length > 0) {
      setSearching(true);
      const results = await searchTransactions(text.trim());
      setTransactions(results);
    } else {
      setSearching(false);
      await loadData();
    }
  };

  const handleExport = async (period) => {
    try {
      const txns = await getAllTransactionsForExport(period);
      if (txns.length === 0) { Alert.alert('No Data', 'No transactions for this period.'); return; }
      const csv = transactionsToCSV(txns);
      const path = `${FileSystem.documentDirectory}cycash-${period}.csv`;
      await FileSystem.writeAsStringAsync(path, csv);
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Export Transactions' });
      } else {
        Alert.alert('Exported', `File saved to ${path}`);
      }
    } catch (e) {
      Alert.alert('Error', 'Export failed.');
    }
  };

  const handleSendToTelegram = async () => {
    const r = await sendDailySummary(true);
    if (r.success) Alert.alert('Sent!', 'Summary sent to Telegram.');
    else Alert.alert('Error', r.error || 'Check Telegram settings.');
  };

  const todayProfit = summary.totalFee;
  const cashinTotal = summary.cashin.amount;
  const cashoutTotal = summary.cashout.amount;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Date & Time */}
      <View style={[styles.dateRow]}>
        <Text style={[styles.dateTitle, { color: C.textSecondary }]}>
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>
        <Text style={[styles.clock, { color: C.primary }]}>{phTime}</Text>
      </View>

      {/* Total Income Card */}
      <View style={[styles.totalCard, { backgroundColor: C.primary }]}>
        <Text style={styles.totalLabel}>Total Income Today</Text>
        <Text style={styles.totalAmount}>{formatCurrency(summary.totalFee)}</Text>
        <View style={styles.totalRow}>
          <View style={styles.totalItem}>
            <Ionicons name="arrow-down-circle" size={18} color="#fff" />
            <Text style={styles.totalItemLabel}>Cash In Fees</Text>
            <Text style={[styles.totalItemValue, { color: '#fff' }]}>{formatCurrency(summary.cashin.fee)}</Text>
          </View>
          <View style={styles.totalItem}>
            <Ionicons name="arrow-up-circle" size={18} color="#fff" />
            <Text style={styles.totalItemLabel}>Cash Out Fees</Text>
            <Text style={[styles.totalItemValue, { color: '#fff' }]}>{formatCurrency(summary.cashout.fee)}</Text>
          </View>
        </View>
      </View>

      {/* Today's Profit Card */}
      <View style={[styles.profitCard, { backgroundColor: C.surface, borderColor: C.profit }]}>
        <View style={styles.profitLeft}>
          <Ionicons name="trending-up" size={22} color={C.profit} />
          <View>
            <Text style={[styles.profitLabel, { color: C.textSecondary }]}>Today's Profit</Text>
            <Text style={[styles.profitAmount, { color: C.profit }]}>{formatCurrency(todayProfit)}</Text>
          </View>
        </View>
        <View style={styles.profitBreakdown}>
          <Text style={[styles.profitDetail, { color: C.cashin }]}>In: {formatCurrency(cashinTotal)}</Text>
          <Text style={[styles.profitDetail, { color: C.cashout }]}>Out: {formatCurrency(cashoutTotal)}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Ionicons name="search" size={18} color={C.textLight} />
        <TextInput
          style={[styles.searchInput, { color: C.text }]}
          placeholder="Search transactions..."
          placeholderTextColor={C.textLight}
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={18} color={C.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Action Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0088cc' }]} onPress={handleSendToTelegram}>
          <Ionicons name="paper-plane" size={16} color="#fff" />
          <Text style={styles.actionBtnText}>Telegram</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.secondary }]} onPress={() => handleExport('today')}>
          <Ionicons name="download-outline" size={16} color="#fff" />
          <Text style={styles.actionBtnText}>CSV</Text>
        </TouchableOpacity>
      </View>

      {/* CSV Period Options */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {QUICK_CSV_PERIODS.map((p) => (
            <TouchableOpacity key={p.key} style={[styles.csvPeriodBtn, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => handleExport(p.key)}>
              <Ionicons name={p.icon} size={14} color={C.textSecondary} />
              <Text style={[styles.csvPeriodText, { color: C.textSecondary }]}>Export {p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Clear Today */}
      {!searching && transactions.length > 0 && (
        <TouchableOpacity
          style={[styles.clearBtn, { backgroundColor: C.danger }]}
          onPress={() => Alert.alert(
            'Clear Today\'s Sales',
            'Delete ALL transactions for today? This cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Clear All', style: 'destructive',
                onPress: async () => {
                  await clearTodayTransactions();
                  await loadData();
                },
              },
            ]
          )}
        >
          <Ionicons name="trash-outline" size={16} color="#fff" />
          <Text style={styles.clearBtnText}>Clear Today's Sales</Text>
        </TouchableOpacity>
      )}

      {/* Transactions */}
      <Text style={[styles.sectionTitle, { color: C.text }]}>
        {searching ? 'Search Results' : "Today's Transactions"} ({transactions.length})
      </Text>

      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color={C.textLight} />
          <Text style={[styles.emptyText, { color: C.textSecondary }]}>
            {searching ? 'No matching transactions' : 'No transactions today'}
          </Text>
          <Text style={[styles.emptySubText, { color: C.textLight }]}>Go to Record Sale to add one</Text>
        </View>
      ) : (
        transactions.map((txn) => (
          <TouchableOpacity key={txn.id} style={[styles.txnCard, { backgroundColor: C.surface }]}
            onLongPress={() => handleDelete(txn.id)} activeOpacity={0.7}>
            <View style={styles.txnLeft}>
              <View style={[styles.txnIcon, { backgroundColor: txn.type === 'cashin' ? C.secondaryLight : C.accentLight }]}>
                <Ionicons name={txn.type === 'cashin' ? 'arrow-down-circle' : 'arrow-up-circle'} size={22}
                  color={txn.type === 'cashin' ? C.cashin : C.cashout} />
              </View>
              <View>
                <Text style={[styles.txnType, { color: C.text }]}>{txn.type === 'cashin' ? 'Cash In' : 'Cash Out'}</Text>
                <Text style={[styles.txnTime, { color: C.textLight }]}>{formatDateTime(txn.created_at)}</Text>
              </View>
            </View>
            <View style={styles.txnRight}>
              <Text style={[styles.txnAmount, { color: C.text }]}>{formatCurrency(txn.amount)}</Text>
              <Text style={[styles.txnFee, { color: C.textLight }]}>Fee: {formatCurrency(txn.fee)}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateTitle: { fontSize: 14 },
  clock: { fontSize: 14, fontWeight: 'bold' },
  totalCard: { borderRadius: 16, padding: 20, marginBottom: 12, elevation: 4, shadowColor: '#0078D4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  totalAmount: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  totalItem: { alignItems: 'center', flex: 1 },
  totalItemLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },
  totalItemValue: { fontSize: 16, fontWeight: 'bold' },
  profitCard: { borderRadius: 14, padding: 16, marginBottom: 12, borderLeftWidth: 4, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  profitLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profitLabel: { fontSize: 13 },
  profitAmount: { fontSize: 24, fontWeight: 'bold' },
  profitBreakdown: { flexDirection: 'row', gap: 16, marginTop: 8, paddingLeft: 34 },
  profitDetail: { fontSize: 13, fontWeight: '500' },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, height: 44 },
  searchInput: { flex: 1, fontSize: 14, marginLeft: 8, paddingVertical: 0 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, padding: 12, flex: 1 },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  csvPeriodBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  csvPeriodText: { fontSize: 12, fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, marginTop: 12 },
  emptySubText: { fontSize: 13, marginTop: 4 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, padding: 12, marginBottom: 12 },
  clearBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  txnCard: { borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  txnLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txnIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txnType: { fontSize: 15, fontWeight: '600' },
  txnTime: { fontSize: 12, marginTop: 2 },
  txnRight: { alignItems: 'flex-end' },
  txnAmount: { fontSize: 16, fontWeight: 'bold' },
  txnFee: { fontSize: 12, marginTop: 2 },
});
