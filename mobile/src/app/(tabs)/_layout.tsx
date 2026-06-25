import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/* ────────────────────────────────────────────────────────────────────────── */
/*  Tab icon map                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

const TAB_ICONS: Record<
  string,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }
> = {
  index: { active: 'home', inactive: 'home-outline' },
  plan: { active: 'book', inactive: 'book-outline' },
  shop: { active: 'storefront', inactive: 'storefront-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Layout                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        /* ── Tab bar icon ───────────────────────────────────── */
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          if (!icons) return null;
          const iconName = focused ? icons.active : icons.inactive;
          return <Ionicons name={iconName} size={size ?? 22} color={color} />;
        },

        /* ── Tab bar colours ────────────────────────────────── */
        tabBarActiveTintColor: '#00F0FF',
        tabBarInactiveTintColor: '#5A6178',

        /* ── Tab bar chrome ─────────────────────────────────── */
        tabBarStyle: {
          backgroundColor: '#141824',
          borderTopColor: 'rgba(255, 255, 255, 0.05)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          height: Platform.OS === 'ios' ? 92 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 8,
          // Elevation / shadow
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
          elevation: 16,
          // Absolute positioning so rounded corners sit over content
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
        },

        /* ── Tab bar label ──────────────────────────────────── */
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 1,
          textTransform: 'uppercase',
        },

        /* ── Header ─────────────────────────────────────────── */
        headerStyle: {
          backgroundColor: '#0E111F',
        },
        headerTintColor: '#00F0FF',
        headerTitleStyle: {
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: 1.5,
        },
        headerTitleAlign: 'center',
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'DASHBOARD',
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'PLANS',
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'EXCHANGE',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFILE',
        }}
      />
    </Tabs>
  );
}
