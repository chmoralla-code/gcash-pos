import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/ThemeContext';
import { getSupabase, signUp, signIn, signOut, getCurrentUser, restoreSession, syncTransactions } from '../../src/supabaseService';
import { getUnsyncedTransactions, markTransactionsSynced, mergeRemoteTransactions, getAllTransactions } from '../../src/database';
import { isSupabaseConfigured } from '../../src/supabaseConfig';

export default function CloudScreen() {
  const { colors: C } = useTheme();
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadUser = async () => {
    if (!isSupabaseConfigured()) return;
    const u = await restoreSession();
    setUser(u);
  };

  useFocusEffect(React.useCallback(() => { loadUser(); }, []));

  const handleSignUp = async () => {
    if (!email || !password) { Alert.alert('Required', 'Enter email and password.'); return; }
    setLoading(true);
    const r = await signUp(email.trim(), password);
    setLoading(false);
    if (r.success) {
      Alert.alert('Check Email', 'Verify your email, then sign in.');
      setUser(r.user);
    } else {
      Alert.alert('Error', r.error);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) { Alert.alert('Required', 'Enter email and password.'); return; }
    setLoading(true);
    const r = await signIn(email.trim(), password);
    setLoading(false);
    if (r.success) {
      setUser(r.user);
      Alert.alert('Signed In', 'Welcome!');
    } else {
      Alert.alert('Error', r.error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setEmail('');
    setPassword('');
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Push local unsynced
      const unsynced = await getUnsyncedTransactions();
      const result = await syncTransactions(unsynced);
      if (!result.success) {
        Alert.alert('Sync Error', result.error);
        setSyncing(false);
        return;
      }
      // Mark local as synced
      const localIds = unsynced.map(t => t.sync_id).filter(Boolean);
      if (localIds.length > 0) await markTransactionsSynced(localIds);
      // Pull remote
      if (result.remote && result.remote.length > 0) {
        const count = await mergeRemoteTransactions(result.remote);
        Alert.alert('Synced!', `${unsynced.length} pushed, ${count} pulled.`);
      } else {
        Alert.alert('Synced!', `${unsynced.length} transactions pushed.`);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setSyncing(false);
  };

  if (!isSupabaseConfigured()) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: C.background }]} contentContainerStyle={styles.content}>
        <View style={styles.notConfigured}>
          <Ionicons name="cloud-offline-outline" size={48} color={C.textLight} />
          <Text style={[styles.title, { color: C.text }]}>Cloud Sync Not Configured</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>
            Open src/supabaseConfig.js and add your Supabase URL and anon key.{'\n\n'}
            1. Go to supabase.com → Create account → New project{'\n'}
            2. Go to Project Settings → API{'\n'}
            3. Copy URL and anon key into supabaseConfig.js{'\n'}
            4. Create a 'transactions' table with columns:{'\n'}
               user_id, sync_id, type, amount, fee, created_at
          </Text>
        </View>
      </ScrollView>
    );
  }

  if (user) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: C.background }]} contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Ionicons name="checkmark-circle" size={40} color={C.success} />
          <Text style={[styles.title, { color: C.text }]}>Signed In</Text>
          <Text style={[styles.email, { color: C.textSecondary }]}>{user.email}</Text>
        </View>

        <TouchableOpacity style={[styles.syncBtn, { backgroundColor: C.primary }]} onPress={handleSync} disabled={syncing}>
          <Ionicons name="sync" size={20} color="#fff" />
          <Text style={styles.btnText}>{syncing ? 'Syncing...' : 'Sync Now'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.outBtn, { backgroundColor: C.danger }]} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.btnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: C.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Ionicons name="cloud-upload" size={40} color={C.primary} />
        <Text style={[styles.title, { color: C.text }]}>Cloud Backup</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>Sync your records across devices</Text>
      </View>

      <Text style={[styles.label, { color: C.text }]}>Email</Text>
      <TextInput style={[styles.input, { backgroundColor: C.surface, color: C.text, borderColor: C.border }]}
        placeholder="your@email.com" placeholderTextColor={C.textLight}
        value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

      <Text style={[styles.label, { color: C.text }]}>Password</Text>
      <TextInput style={[styles.input, { backgroundColor: C.surface, color: C.text, borderColor: C.border }]}
        placeholder="min 6 characters" placeholderTextColor={C.textLight}
        value={password} onChangeText={setPassword} secureTextEntry />

      <TouchableOpacity style={[styles.signInBtn, { backgroundColor: C.primary }]} onPress={handleSignIn} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Please wait...' : 'Sign In'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.signUpBtn, { borderColor: C.primary }]} onPress={handleSignUp} disabled={loading}>
        <Text style={[styles.signUpText, { color: C.primary }]}>Create Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  card: { alignItems: 'center', padding: 24, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginTop: 12, textAlign: 'center' },
  subtitle: { fontSize: 13, marginTop: 4, textAlign: 'center', lineHeight: 20 },
  email: { fontSize: 14, marginTop: 4 },
  notConfigured: { alignItems: 'center', paddingVertical: 40 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: { borderRadius: 10, padding: 14, fontSize: 15, borderWidth: 1, marginBottom: 12 },
  signInBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, elevation: 2 },
  signUpBtn: { borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 10, borderWidth: 1.5 },
  signUpText: { fontSize: 15, fontWeight: '600' },
  syncBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, padding: 16, marginBottom: 10 },
  outBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, padding: 16 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
