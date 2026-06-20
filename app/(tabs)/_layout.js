import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/ThemeContext';

export default function TabLayout() {
  const { colors: C } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textLight,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.border,
          borderTopWidth: 1,
          paddingTop: 6,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: C.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'Dashboard', headerTitle: 'CyCash',
        tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
      }} />
      <Tabs.Screen name="record" options={{
        title: 'Record Sale', headerTitle: 'Record',
        tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size} color={color} />,
      }} />
      <Tabs.Screen name="analytics" options={{
        title: 'Analytics', headerTitle: 'Analytics',
        tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" size={size} color={color} />,
      }} />
      <Tabs.Screen name="settings" options={{
        title: 'Settings', headerTitle: 'Settings',
        tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
      }} />
      <Tabs.Screen name="telegram" options={{
        title: 'Telegram', headerTitle: 'Telegram',
        tabBarIcon: ({ color, size }) => <Ionicons name="paper-plane" size={size} color={color} />,
      }} />
      <Tabs.Screen name="cloud" options={{
        title: 'Cloud', headerTitle: 'Cloud Sync',
        tabBarIcon: ({ color, size }) => <Ionicons name="cloud" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
