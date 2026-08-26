import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Platform, Alert, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../utils/supabase';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

/* ────────────────────────────────────────────────────────────────────────── */
/*  Tab icon map                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

const TAB_ICONS: Record<
  string,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }
> = {
  index: { active: 'home', inactive: 'home-outline' },
  plan: { active: 'book', inactive: 'book-outline' },
  calendar: { active: 'calendar', inactive: 'calendar-outline' },
  shop: { active: 'storefront', inactive: 'storefront-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Layout                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

export default function TabsLayout() {
  const [level, setLevel] = useState<number>(1);
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { colors } = useTheme();

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && isMounted) {
        supabase
          .from('profiles')
          .select('level')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.level != null && isMounted) setLevel(data.level);
          });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const tabHeight = Platform.OS === 'ios' ? 56 + insets.bottom : 64;
  const paddingBottom = Platform.OS === 'ios' ? Math.max(16, insets.bottom) : 10;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        /* ── Tab bar icon ───────────────────────────────────── */
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          if (!icons) return null;
          const iconName = focused ? icons.active : icons.inactive;
          return (
            <View style={styles.iconContainer}>
              <Ionicons name={iconName} size={focused ? (size ?? 22) + 1 : (size ?? 22)} color={color} />
              {focused && (
                <View
                  style={[
                    styles.activeIndicatorDot,
                    { backgroundColor: colors.primary },
                  ]}
                />
              )}
            </View>
          );
        },

        /* ── Tab bar colours ────────────────────────────────── */
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inactive,
        tabBarHideOnKeyboard: true,

        /* ── Tab bar chrome ─────────────────────────────────── */
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={40}
              tint="dark"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: 'rgba(11, 13, 23, 0.75)',
                  borderTopWidth: 1,
                  borderTopColor: colors.glassBorder,
                },
              ]}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: colors.card,
                  borderTopWidth: 1,
                  borderTopColor: colors.glassBorder,
                },
              ]}
            />
          ),
        tabBarStyle: {
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          height: tabHeight,
          paddingBottom,
          paddingTop: 8,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          elevation: 16,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
        },

        /* ── Tab bar label ──────────────────────────────────── */
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '800',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        },
        tabBarItemStyle: {
          paddingHorizontal: 2,
        },

        /* ── Header ─────────────────────────────────────────── */
        headerStyle: {
          backgroundColor: colors.headerBg,
        },
        headerTintColor: colors.primary,
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
          title: t('nav.home') || 'DASHBOARD',
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: t('nav.plan') || 'PLANS',
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('nav.calendar') || 'CALENDAR',
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: t('nav.shop') || 'EXCHANGE',
        }}
        listeners={{
          tabPress: (e) => {
            if (level < 2) {
              e.preventDefault();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              Alert.alert('FEATURE LOCKED', 'Reach Level 2 to unlock the Exchange Store.');
            }
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile') || 'PROFILE',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  activeIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});

