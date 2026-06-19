import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, formatCurrency } from '../../src/constants';
import {
  getFeeSettings,
  addFeeSetting,
  updateFeeSetting,
  deleteFeeSetting,
} from '../../src/database';

export default function FeeSettingsScreen() {
  const [activeTab, setActiveTab] = useState('cashin');
  const [feeTiers, setFeeTiers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTier, setEditingTier] = useState(null);

  // Form state
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [feeAmount, setFeeAmount] = useState('');

  const loadData = useCallback(async () => {
    const tiers = await getFeeSettings(activeTab);
    setFeeTiers(tiers);
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const resetForm = () => {
    setMinAmount('');
    setMaxAmount('');
    setFeeAmount('');
    setEditingTier(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (tier) => {
    setEditingTier(tier);
    setMinAmount(String(tier.min_amount));
    setMaxAmount(tier.max_amount ? String(tier.max_amount) : '');
    setFeeAmount(String(tier.fee_amount));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!minAmount || !feeAmount) {
      Alert.alert('Required', 'Minimum amount and fee amount are required.');
      return;
    }

    const min = parseFloat(minAmount);
    const fee = parseFloat(feeAmount);
    const max = maxAmount ? parseFloat(maxAmount) : null;

    if (isNaN(min) || isNaN(fee) || min < 0 || fee < 0) {
      Alert.alert('Invalid', 'Please enter valid numbers.');
      return;
    }

    if (max !== null && max <= min) {
      Alert.alert('Invalid', 'Maximum amount must be greater than minimum amount.');
      return;
    }

    try {
      if (editingTier) {
        await updateFeeSetting(editingTier.id, min, max, fee);
      } else {
        await addFeeSetting(activeTab, min, max, fee);
      }
      setModalVisible(false);
      resetForm();
      await loadData();
    } catch (e) {
      Alert.alert('Error', 'Failed to save fee setting.');
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Fee Tier',
      'Are you sure you want to delete this fee tier?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteFeeSetting(id);
            await loadData();
          },
        },
      ]
    );
  };

  const getFeeSummary = () => {
    if (feeTiers.length === 0) return null;
    const sorted = [...feeTiers].sort((a, b) => a.min_amount - b.min_amount);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    return {
      tiers: sorted.length,
      range: `₱${first.min_amount.toLocaleString()} - ₱${last.max_amount ? last.max_amount.toLocaleString() : '∞'}`,
      base: sorted[0].fee_amount,
    };
  };

  const feeSummary = getFeeSummary();

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cashin' && styles.tabActiveCashin]}
          onPress={() => setActiveTab('cashin')}
        >
          <Ionicons
            name="arrow-down-circle"
            size={18}
            color={activeTab === 'cashin' ? '#fff' : COLORS.cashin}
          />
          <Text style={[styles.tabText, activeTab === 'cashin' && styles.tabTextActive]}>
            Cash In Fees
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cashout' && styles.tabActiveCashout]}
          onPress={() => setActiveTab('cashout')}
        >
          <Ionicons
            name="arrow-up-circle"
            size={18}
            color={activeTab === 'cashout' ? '#fff' : COLORS.cashout}
          />
          <Text style={[styles.tabText, activeTab === 'cashout' && styles.tabTextActive]}>
            Cash Out Fees
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Summary */}
        {feeSummary && (
          <View style={styles.summaryCard}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.summaryText}>
              {feeSummary.tiers} fee tier(s) · Range: {feeSummary.range}
            </Text>
          </View>
        )}

        {/* Fee Tiers List */}
        {feeTiers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pricetag-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No fee tiers configured</Text>
            <Text style={styles.emptySubText}>
              Add fee tiers so the system can auto-calculate fees when recording sales
            </Text>
          </View>
        ) : (
          feeTiers.map((tier) => (
            <TouchableOpacity
              key={tier.id}
              style={styles.tierCard}
              onPress={() => openEditModal(tier)}
              onLongPress={() => handleDelete(tier.id)}
              activeOpacity={0.7}
            >
              <View style={styles.tierInfo}>
                <Text style={styles.tierRange}>
                  ₱{tier.min_amount.toLocaleString()}
                  {tier.max_amount
                    ? ` - ₱${tier.max_amount.toLocaleString()}`
                    : '+'}
                </Text>
                <Text style={styles.tierLabel}>Amount Range</Text>
              </View>
              <View style={styles.tierDivider} />
              <View style={styles.tierFee}>
                <Text style={styles.tierFeeAmount}>{formatCurrency(tier.fee_amount)}</Text>
                <Text style={styles.tierLabel}>Fee</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          ))
        )}

        {/* Add Button */}
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.addBtnText}>Add Fee Tier</Text>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="bulb-outline" size={20} color={COLORS.warning} />
          <Text style={styles.infoText}>
            Set up fee tiers so the system auto-calculates fees when you record sales.
            Long-press a tier to delete it.
          </Text>
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTier ? 'Edit Fee Tier' : 'Add Fee Tier'}
              </Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <Ionicons name="close-circle" size={28} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Minimum Amount (₱)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., 1"
              placeholderTextColor={COLORS.textLight}
              keyboardType="decimal-pad"
              value={minAmount}
              onChangeText={setMinAmount}
            />

            <Text style={styles.modalLabel}>Maximum Amount (₱) — leave blank for unlimited</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., 500 (or blank for ∞)"
              placeholderTextColor={COLORS.textLight}
              keyboardType="decimal-pad"
              value={maxAmount}
              onChangeText={setMaxAmount}
            />

            <Text style={styles.modalLabel}>Fee Amount (₱)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., 15"
              placeholderTextColor={COLORS.textLight}
              keyboardType="decimal-pad"
              value={feeAmount}
              onChangeText={setFeeAmount}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>
                {editingTier ? 'Update Fee Tier' : 'Save Fee Tier'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  tabActiveCashin: {
    backgroundColor: COLORS.cashin,
    borderColor: COLORS.cashin,
  },
  tabActiveCashout: {
    backgroundColor: COLORS.cashout,
    borderColor: COLORS.cashout,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 13,
    color: COLORS.primaryDark,
    flex: 1,
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
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  tierCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  tierInfo: {
    flex: 1,
  },
  tierRange: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  tierLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  tierDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  tierFee: {
    alignItems: 'center',
    marginRight: 12,
  },
  tierFeeAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    elevation: 2,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 14,
    marginTop: 20,
  },
  infoText: {
    fontSize: 13,
    color: '#6D5B00',
    flex: 1,
    lineHeight: 18,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    elevation: 2,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
