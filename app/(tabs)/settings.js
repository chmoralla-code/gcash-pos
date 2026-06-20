import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, Switch, Linking,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../src/constants';
import { useTheme } from '../../src/ThemeContext';
import { getFeeSettings, addFeeSetting, updateFeeSetting, deleteFeeSetting } from '../../src/database';

export default function FeeSettingsScreen() {
  const { isDark, toggleDark, colors: C } = useTheme();
  const [feeTiers, setFeeTiers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [feeAmount, setFeeAmount] = useState('');

  const loadData = useCallback(async () => {
    const tiers = await getFeeSettings();
    setFeeTiers(tiers.sort((a, b) => a.min_amount - b.min_amount));
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const resetForm = () => { setMinAmount(''); setMaxAmount(''); setFeeAmount(''); setEditingTier(null); };

  const openAddModal = () => { resetForm(); setModalVisible(true); };

  const openEditModal = (tier) => {
    setEditingTier(tier);
    setMinAmount(String(tier.min_amount));
    setMaxAmount(tier.max_amount ? String(tier.max_amount) : '');
    setFeeAmount(String(tier.fee_amount));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!minAmount || !feeAmount) {
      Alert.alert('Required', 'Minimum amount and fee are required.');
      return;
    }
    const min = parseFloat(minAmount);
    const max = maxAmount ? parseFloat(maxAmount) : null;
    const fee = parseFloat(feeAmount);
    if (isNaN(min) || isNaN(fee) || min < 0 || fee < 0) {
      Alert.alert('Invalid', 'Please enter valid numbers.');
      return;
    }
    if (max !== null && max <= min) {
      Alert.alert('Invalid', 'Maximum must be greater than minimum.');
      return;
    }
    try {
      if (editingTier) {
        await updateFeeSetting(editingTier.id, min, max, fee);
      } else {
        await addFeeSetting(min, max, fee);
      }
      setModalVisible(false);
      resetForm();
      await loadData();
    } catch (e) {
      Alert.alert('Error', 'Failed to save fee setting.');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Fee Tier', 'Delete this fee tier?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteFeeSetting(id); await loadData(); } },
    ]);
  };

  const getNextTier = () => {
    if (feeTiers.length === 0) return 'No tiers configured';
    const sorted = [...feeTiers].sort((a, b) => a.min_amount - b.min_amount);
    return `${sorted.length} fee tier(s) · ₱${sorted[0].min_amount.toLocaleString()} - ${sorted[sorted.length-1].max_amount ? '₱'+sorted[sorted.length-1].max_amount.toLocaleString() : '∞'}`;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: C.background }]} contentContainerStyle={styles.content}>
      {/* Header card */}
      <View style={[styles.headerCard, { backgroundColor: C.primary }]}>
        <Ionicons name="pricetag" size={24} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Fee Settings</Text>
          <Text style={styles.headerSub}>Applies to both Cash In & Cash Out</Text>
        </View>
      </View>

      {/* Dark Mode Toggle */}
      <View style={[styles.switchRow, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={styles.switchInfo}>
          <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={C.text} />
          <Text style={[styles.switchLabel, { color: C.text }]}>Dark Mode</Text>
        </View>
        <Switch
          value={isDark}
          onValueChange={toggleDark}
          trackColor={{ false: C.border, true: C.primaryLight }}
          thumbColor={isDark ? C.primary : '#f4f3f4'}
        />
      </View>

      {/* Summary */}
      {feeTiers.length > 0 && (
        <View style={[styles.summaryCard, { backgroundColor: C.primaryLight }]}>
          <Ionicons name="information-circle" size={18} color={C.primary} />
          <Text style={[styles.summaryText, { color: C.primaryDark }]}>{getNextTier()}</Text>
        </View>
      )}

      {/* Fee Tiers List */}
      {feeTiers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="pricetag-outline" size={48} color={C.textLight} />
          <Text style={[styles.emptyText, { color: C.textSecondary }]}>No fee tiers configured</Text>
          <Text style={[styles.emptySubText, { color: C.textLight }]}>
            Set fee tiers so the app auto-calculates fees for both Cash In & Cash Out
          </Text>
        </View>
      ) : (
        feeTiers.map((tier) => (
          <TouchableOpacity
            key={tier.id}
            style={[styles.tierCard, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => openEditModal(tier)}
            onLongPress={() => handleDelete(tier.id)}
            activeOpacity={0.7}
          >
            <View style={styles.tierInfo}>
              <Text style={[styles.tierAmount, { color: C.text }]}>
                ₱{tier.min_amount.toLocaleString()} - {tier.max_amount ? '₱'+tier.max_amount.toLocaleString() : '∞'}
              </Text>
              <Text style={[styles.tierLabel, { color: C.textLight }]}>Amount Range</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={C.textLight} />
            <View style={styles.tierFeeRight}>
              <Text style={[styles.tierFeeAmount, { color: C.accent }]}>{formatCurrency(tier.fee_amount)}</Text>
              <Text style={[styles.tierLabel, { color: C.textLight }]}>Fee</Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      <TouchableOpacity style={[styles.addBtn, { backgroundColor: C.primary }]} onPress={openAddModal}>
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.addBtnText}>Add Fee Tier</Text>
      </TouchableOpacity>

      {/* Credit Footer */}
      <View style={styles.creditSection}>
        <Text style={[styles.creditText, { color: C.textLight }]}>Developed by</Text>
        <TouchableOpacity onPress={() => Linking.openURL('https://www.facebook.com/profile.php?id=61584774638218')}>
          <Text style={[styles.creditName, { color: C.primary }]}>Cyrhiel Moralla</Text>
        </TouchableOpacity>
      </View>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>
                {editingTier ? 'Edit Fee Tier' : 'Add Fee Tier'}
              </Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <Ionicons name="close-circle" size={28} color={C.textLight} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: C.textSecondary }]}>Minimum Amount (₱)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: C.background, color: C.text, borderColor: C.border }]}
              placeholder="e.g. 1"
              placeholderTextColor={C.textLight}
              keyboardType="decimal-pad"
              value={minAmount}
              onChangeText={setMinAmount}
            />

            <Text style={[styles.modalLabel, { color: C.textSecondary }]}>Maximum Amount (₱)</Text>
            <Text style={[styles.modalHint, { color: C.textLight }]}>Leave blank for unlimited</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: C.background, color: C.text, borderColor: C.border }]}
              placeholder="e.g. 500"
              placeholderTextColor={C.textLight}
              keyboardType="decimal-pad"
              value={maxAmount}
              onChangeText={setMaxAmount}
            />

            <Text style={[styles.modalLabel, { color: C.textSecondary }]}>Fee (₱)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: C.background, color: C.text, borderColor: C.border }]}
              placeholder="e.g. 15"
              placeholderTextColor={C.textLight}
              keyboardType="decimal-pad"
              value={feeAmount}
              onChangeText={setFeeAmount}
            />

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: C.primary }]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{editingTier ? 'Update' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  headerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 16, marginBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1 },
  switchInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchLabel: { fontSize: 15, fontWeight: '600' },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginBottom: 16 },
  summaryText: { fontSize: 13, flex: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, marginTop: 12 },
  emptySubText: { fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
  tierCard: { borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  tierInfo: { flex: 1 },
  tierAmount: { fontSize: 17, fontWeight: 'bold' },
  tierLabel: { fontSize: 11, marginTop: 2 },
  tierFeeRight: { alignItems: 'center', marginLeft: 12 },
  tierFeeAmount: { fontSize: 18, fontWeight: 'bold' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, marginTop: 8, elevation: 2 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 4, marginTop: 12 },
  modalHint: { fontSize: 12, marginBottom: 6 },
  modalInput: { borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1 },
  saveBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20, elevation: 2 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  creditSection: { alignItems: 'center', paddingVertical: 30, marginTop: 10 },
  creditText: { fontSize: 12, marginBottom: 4 },
  creditName: { fontSize: 15, fontWeight: 'bold', textDecorationLine: 'underline' },
});
