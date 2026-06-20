import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAppSetting, setAppSetting } from './database';

export default function PinScreen({ onUnlock }) {
  const [mode, setMode] = useState('check');
  const [pin, setPin] = useState('');
  const [storedPin, setStoredPin] = useState(null);
  const [confirmPin, setConfirmPin] = useState('');

  useEffect(() => {
    (async () => {
      const saved = await getAppSetting('appPin');
      if (saved) { setStoredPin(saved); setMode('check'); }
      else { setMode('set'); }
    })();
  }, []);

  useEffect(() => {
    if (pin.length === 4) handleSubmit();
  }, [pin]);

  const handleSubmit = async () => {
    if (mode === 'check') {
      if (pin === storedPin) { onUnlock(); }
      else { setPin(''); }
    } else if (mode === 'set') {
      setConfirmPin(pin);
      setMode('confirm');
      setPin('');
    } else if (mode === 'confirm') {
      if (pin === confirmPin) {
        await setAppSetting('appPin', pin);
        onUnlock();
      } else {
        setMode('set');
        setConfirmPin('');
        setPin('');
      }
    }
  };

  const handleKey = (k) => { if (pin.length < 4) setPin(p => p + k); };
  const handleBack = () => { if (pin.length > 0) setPin(p => p.slice(0, -1)); };

  const title = mode === 'check' ? 'Enter PIN' : mode === 'set' ? 'Set a 4-digit PIN' : 'Confirm PIN';

  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed" size={48} color="#8000FF" style={{ marginBottom: 16 }} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>CyCash</Text>
      <View style={styles.dotsRow}>
        {[1, 2, 3, 4].map(i => <View key={i} style={[styles.dot, pin.length >= i && styles.dotFilled]} />)}
      </View>
      {mode === 'check' && pin.length === 4 && pin !== storedPin && (
        <Text style={styles.error}>Wrong PIN. Try again.</Text>
      )}
      <View style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <TouchableOpacity key={n} style={styles.key} onPress={() => handleKey(String(n))}>
            <Text style={styles.keyText}>{n}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.key} />
        <TouchableOpacity style={styles.key} onPress={() => handleKey('0')}>
          <Text style={styles.keyText}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.key} onPress={handleBack}>
          <Ionicons name="backspace-outline" size={24} color="#1A1A2E" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 30 },
  dotsRow: { flexDirection: 'row', gap: 16, marginBottom: 40 },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#E5E7EB' },
  dotFilled: { backgroundColor: '#8000FF' },
  error: { color: '#DC3545', fontSize: 14, marginBottom: 20 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 260, justifyContent: 'center' },
  key: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 26, fontWeight: '600', color: '#1A1A2E' },
});
