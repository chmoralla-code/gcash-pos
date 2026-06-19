import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { formatCurrency, PERIODS } from '../../src/constants';
import { useTheme } from '../../src/ThemeContext';
import { getIncomeSummary, getTransactionsByPeriod } from '../../src/database';

const sw = Dimensions.get('window').width;
const PERIODS_LIST = [
  { key: PERIODS.TODAY, label: 'Today', icon: 'today' },
  { key: PERIODS.YESTERDAY, label: 'Yesterday', icon: 'calendar' },
  { key: PERIODS.DAYS_15, label: '15 Days', icon: 'calendar' },
  { key: PERIODS.MONTHLY, label: 'Monthly', icon: 'calendar' },
  { key: PERIODS.YEARLY, label: 'Yearly', icon: 'calendar' },
];

export default function AnalyticsScreen() {
  const { colors: C } = useTheme();
  const [period, setPeriod] = useState(PERIODS.TODAY);
  const [summary, setSummary] = useState({ cashin: { count: 0, amount: 0, fee: 0 }, cashout: { count: 0, amount: 0, fee: 0 }, totalFee: 0 });
  const [transactions, setTransactions] = useState([]);

  const loadData = useCallback(async () => {
    const [s, t] = await Promise.all([getIncomeSummary(period), getTransactionsByPeriod(period)]);
    setSummary(s); setTransactions(t);
  }, [period]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const periodLabel = PERIODS_LIST.find(p => p.key === period)?.label || 'Today';
  const hasData = summary.totalFee > 0;

  const chartData = {
    labels: ['Cash In', 'Cash Out'],
    datasets: [{ data: [summary.cashin.fee || 1, summary.cashout.fee || 1], colors: [(o = 1) => `rgba(0,166,80,${o})`, (o = 1) => `rgba(255,107,53,${o})`] }],
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: C.background }]} contentContainerStyle={styles.content}>
      {/* Period Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {PERIODS_LIST.map(p => (
            <TouchableOpacity key={p.key} style={[styles.periodBtn, { backgroundColor: C.surface, borderColor: C.border }, period === p.key && { backgroundColor: C.primary, borderColor: C.primary }]}
              onPress={() => setPeriod(p.key)}>
              <Ionicons name={p.icon} size={16} color={period === p.key ? '#fff' : C.textSecondary} />
              <Text style={[styles.periodText, { color: period === p.key ? '#fff' : C.textSecondary }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Total */}
      <View style={[styles.totalCard, { backgroundColor: C.primary }]}>
        <Text style={styles.totalLabel}>Total Income ({periodLabel})</Text>
        <Text style={styles.totalAmount}>{formatCurrency(summary.totalFee)}</Text>
        <View style={styles.totalRow}>
          <Text style={[styles.totalItem, { color: '#fff' }]}>Cash In: {formatCurrency(summary.cashin.fee)}</Text>
          <Text style={[styles.totalItem, { color: '#fff' }]}>Cash Out: {formatCurrency(summary.cashout.fee)}</Text>
        </View>
      </View>

      {/* Chart */}
      {hasData && (
        <View style={[styles.chartCard, { backgroundColor: C.surface }]}>
          <Text style={[styles.chartTitle, { color: C.text }]}>Fee Comparison</Text>
          <BarChart data={chartData} width={sw - 64} height={200}
            chartConfig={{ backgroundGradientFrom: C.surface, backgroundGradientTo: C.surface, decimalPlaces: 0, color: () => C.text, labelColor: () => C.textSecondary, barPercentage: 0.6, propsForBackgroundLines: { strokeDasharray: '', stroke: C.border } }}
            yAxisLabel="₱" yAxisSuffix="" fromZero showValuesOnTopOfBars withCustomBarColorFromData flatColor style={{ borderRadius: 8 }} />
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { type: 'cashin', icon: 'arrow-down-circle', label: 'Cash In', color: C.cashin, data: summary.cashin },
          { type: 'cashout', icon: 'arrow-up-circle', label: 'Cash Out', color: C.cashout, data: summary.cashout },
        ].map(s => (
          <View key={s.type} style={[styles.statCard, { backgroundColor: C.surface, borderLeftColor: s.color }]}>
            <Text style={[styles.statLabel, { color: C.textSecondary }]}>{s.label}</Text>
            <Text style={[styles.statCount, { color: C.textLight }]}>{s.data.count} txns</Text>
            <Text style={[styles.statAmt, { color: s.color }]}>{formatCurrency(s.data.amount)}</Text>
            <Text style={[styles.statFee, { color: C.textSecondary }]}>Fee: {formatCurrency(s.data.fee)}</Text>
          </View>
        ))}
      </View>

      {/* Transactions */}
      <Text style={[styles.sectionTitle, { color: C.text }]}>Transactions ({periodLabel})</Text>
      {transactions.length === 0 ? (
        <View style={styles.emptyState}><Ionicons name="document-text-outline" size={40} color={C.textLight} /><Text style={[styles.emptyText, { color: C.textSecondary }]}>No transactions</Text></View>
      ) : transactions.map(t => (
        <View key={t.id} style={[styles.txn, { backgroundColor: C.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name={t.type === 'cashin' ? 'arrow-down-circle' : 'arrow-up-circle'} size={20} color={t.type === 'cashin' ? C.cashin : C.cashout} />
            <View>
              <Text style={[styles.txnType, { color: C.text }]}>{t.type === 'cashin' ? 'Cash In' : 'Cash Out'}</Text>
              <Text style={[styles.txnDate, { color: C.textLight }]}>{new Date(t.created_at.replace(' ', 'T')).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.txnAmt, { color: C.text }]}>{formatCurrency(t.amount)}</Text>
            <Text style={[styles.txnFeeSmall, { color: C.textLight }]}>Fee: {formatCurrency(t.fee)}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 100 },
  periodBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  periodText: { fontSize: 13, fontWeight: '600' },
  totalCard: { borderRadius: 16, padding: 20, marginBottom: 16, elevation: 4 },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  totalAmount: { color: '#fff', fontSize: 34, fontWeight: 'bold', marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  totalItem: { fontSize: 14, fontWeight: '600' },
  chartCard: { borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  chartTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 12, padding: 14, borderLeftWidth: 4, elevation: 2 },
  statLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  statCount: { fontSize: 13, marginBottom: 4 },
  statAmt: { fontSize: 20, fontWeight: 'bold' },
  statFee: { fontSize: 12, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 14, marginTop: 8 },
  txn: { borderRadius: 10, padding: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  txnType: { fontSize: 14, fontWeight: '500' },
  txnDate: { fontSize: 12 },
  txnAmt: { fontSize: 14, fontWeight: '600' },
  txnFeeSmall: { fontSize: 11 },
});
