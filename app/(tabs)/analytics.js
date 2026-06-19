import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { COLORS, formatCurrency, PERIODS } from '../../src/constants';
import { getIncomeSummary, getTransactionsByPeriod } from '../../src/database';

const screenWidth = Dimensions.get('window').width;

const PERIOD_OPTIONS = [
  { key: PERIODS.TODAY, label: 'Today', icon: 'today' },
  { key: PERIODS.YESTERDAY, label: 'Yesterday', icon: 'calendar' },
  { key: PERIODS.DAYS_15, label: '15 Days', icon: 'calendar' },
  { key: PERIODS.MONTHLY, label: 'Monthly', icon: 'calendar' },
  { key: PERIODS.YEARLY, label: 'Yearly', icon: 'calendar' },
];

export default function AnalyticsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS.TODAY);
  const [summary, setSummary] = useState({ cashin: { count: 0, amount: 0, fee: 0 }, cashout: { count: 0, amount: 0, fee: 0 }, totalFee: 0 });
  const [transactions, setTransactions] = useState([]);

  const loadData = useCallback(async () => {
    const [sum, txns] = await Promise.all([
      getIncomeSummary(selectedPeriod),
      getTransactionsByPeriod(selectedPeriod),
    ]);
    setSummary(sum);
    setTransactions(txns);
  }, [selectedPeriod]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getPeriodTitle = () => {
    const option = PERIOD_OPTIONS.find(o => o.key === selectedPeriod);
    return option ? option.label : 'Today';
  };

  const chartData = {
    labels: ['Cash In', 'Cash Out'],
    datasets: [
      {
        data: [summary.cashin.fee || 0.1, summary.cashout.fee || 0.1],
        colors: [
          (opacity = 1) => `rgba(0, 166, 80, ${opacity})`,
          (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
        ],
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: COLORS.surface,
    backgroundGradientTo: COLORS.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 120, 212, ${opacity})`,
    labelColor: () => COLORS.textSecondary,
    barPercentage: 0.6,
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: COLORS.border,
    },
    fillShadowGradientFromOpacity: 1,
    fillShadowGradientToOpacity: 1,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Period Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodScroll}>
        <View style={styles.periodRow}>
          {PERIOD_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.periodBtn,
                selectedPeriod === option.key && styles.periodBtnActive,
              ]}
              onPress={() => setSelectedPeriod(option.key)}
            >
              <Ionicons
                name={option.icon}
                size={16}
                color={selectedPeriod === option.key ? '#fff' : COLORS.textSecondary}
              />
              <Text style={[
                styles.periodText,
                selectedPeriod === option.key && styles.periodTextActive,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Total Income Card */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Income ({getPeriodTitle()})</Text>
        <Text style={styles.totalAmount}>{formatCurrency(summary.totalFee)}</Text>
        <View style={styles.totalRow}>
          <View style={styles.totalItem}>
            <Ionicons name="arrow-down-circle" size={16} color={COLORS.cashin} />
            <Text style={styles.totalItemLabel}>Cash In Fees</Text>
            <Text style={[styles.totalItemValue, { color: COLORS.cashin }]}>
              {formatCurrency(summary.cashin.fee)}
            </Text>
          </View>
          <View style={styles.totalItem}>
            <Ionicons name="arrow-up-circle" size={16} color={COLORS.cashout} />
            <Text style={styles.totalItemLabel}>Cash Out Fees</Text>
            <Text style={[styles.totalItemValue, { color: COLORS.cashout }]}>
              {formatCurrency(summary.cashout.fee)}
            </Text>
          </View>
        </View>
      </View>

      {/* Bar Chart */}
      {summary.totalFee > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Fee Comparison</Text>
          <BarChart
            data={chartData}
            width={screenWidth - 64}
            height={200}
            chartConfig={chartConfig}
            yAxisLabel="₱"
            yAxisSuffix=""
            fromZero
            showValuesOnTopOfBars
            withCustomBarColorFromData
            flatColor
            style={styles.chart}
          />
        </View>
      )}

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: COLORS.cashin }]}>
          <Text style={styles.statLabel}>Cash In</Text>
          <Text style={styles.statCount}>{summary.cashin.count} txns</Text>
          <Text style={[styles.statAmount, { color: COLORS.cashin }]}>
            {formatCurrency(summary.cashin.amount)}
          </Text>
          <View style={styles.statFeeRow}>
            <Ionicons name="cash" size={14} color={COLORS.cashin} />
            <Text style={styles.statFee}>Fee: {formatCurrency(summary.cashin.fee)}</Text>
          </View>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.cashout }]}>
          <Text style={styles.statLabel}>Cash Out</Text>
          <Text style={styles.statCount}>{summary.cashout.count} txns</Text>
          <Text style={[styles.statAmount, { color: COLORS.cashout }]}>
            {formatCurrency(summary.cashout.amount)}
          </Text>
          <View style={styles.statFeeRow}>
            <Ionicons name="cash" size={14} color={COLORS.cashout} />
            <Text style={styles.statFee}>Fee: {formatCurrency(summary.cashout.fee)}</Text>
          </View>
        </View>
      </View>

      {/* Transactions List */}
      <Text style={styles.sectionTitle}>Transactions ({getPeriodTitle()})</Text>
      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={40} color={COLORS.textLight} />
          <Text style={styles.emptyText}>No transactions for this period</Text>
        </View>
      ) : (
        transactions.map((txn) => (
          <View key={txn.id} style={styles.txnCard}>
            <View style={styles.txnLeft}>
              <Ionicons
                name={txn.type === 'cashin' ? 'arrow-down-circle' : 'arrow-up-circle'}
                size={20}
                color={txn.type === 'cashin' ? COLORS.cashin : COLORS.cashout}
              />
              <View>
                <Text style={styles.txnType}>
                  {txn.type === 'cashin' ? 'Cash In' : 'Cash Out'}
                </Text>
                <Text style={styles.txnDate}>
                  {new Date(txn.created_at.replace(' ', 'T')).toLocaleDateString('en-PH', {
                    month: 'short', day: 'numeric',
                  })}
                </Text>
              </View>
            </View>
            <View style={styles.txnRight}>
              <Text style={styles.txnAmount}>{formatCurrency(txn.amount)}</Text>
              <Text style={styles.txnFee}>Fee: {formatCurrency(txn.fee)}</Text>
            </View>
          </View>
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
  periodScroll: {
    marginBottom: 16,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  periodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  periodTextActive: {
    color: '#fff',
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
  },
  totalAmount: {
    color: '#fff',
    fontSize: 34,
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
  chartCard: {
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
  chartTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  chart: {
    borderRadius: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
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
    fontWeight: '600',
    marginBottom: 4,
  },
  statCount: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  statAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statFeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  statFee: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  txnCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  txnType: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  txnDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  txnRight: {
    alignItems: 'flex-end',
  },
  txnAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  txnFee: {
    fontSize: 11,
    color: COLORS.textLight,
  },
});
