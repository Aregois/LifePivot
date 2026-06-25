import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../utils/supabase';
import { C, Gradients, Shadows } from '../../constants/theme';
import { FadeInView } from '../../components/ui/FadeInView';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientText } from '../../components/ui/GradientText';
import { AnimatedProgressBar } from '../../components/ui/AnimatedProgressBar';
import { MetricCard } from '../../components/ui/MetricCard';
import { AvatarMonogram } from '../../components/ui/AvatarMonogram';

/* ────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

function getRankTitle(level: number): string {
  if (level >= 11) return 'GRANDMASTER';
  if (level >= 8) return 'SAGE';
  if (level >= 5) return 'SCHOLAR';
  if (level >= 3) return 'ACOLYTE';
  return 'PATHSEEKER';
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Dashboard Screen                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  /* ── Loading state ──────────────────────────────────────────────────── */

  if (loading && !profile) {
    return (
      <View className="flex-1 justify-center items-center bg-[#0B0D17]">
        <ActivityIndicator size="large" color="#00F0FF" />
      </View>
    );
  }

  /* ── Derived values ─────────────────────────────────────────────────── */

  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const xpProgress = Math.min(1, xp / 1000);
  const tokensBalance = profile?.tokens_balance ?? 0;
  const streak = profile?.current_streak ?? 0;
  const displayName = profile?.username || 'LP';
  const isSubscribed = profile?.is_subscribed ?? false;

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={fetchProfile}
          tintColor="#00F0FF"
        />
      }
      className="flex-1 bg-[#0B0D17]"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 20,
        // Leave room for absolute-positioned tab bar
        paddingBottom: Platform.OS === 'ios' ? 110 : 86,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── 1. Hero Card ────────────────────────────────────────────── */}
      <FadeInView delay={0} style={{ marginBottom: 16 }}>
        <LinearGradient
          colors={Gradients.hero as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            {
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: C.glassBorderSubtle,
              overflow: 'hidden',
            },
            Shadows.elevated,
          ]}
        >
          {/* Decorative glow orb */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 128,
              height: 128,
              borderRadius: 64,
              backgroundColor: C.electricBlue,
              opacity: 0.05,
            }}
          />

          {/* Content row: text + avatar */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Left text */}
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text
                style={{
                  color: C.electricBlue,
                  fontSize: 10,
                  fontWeight: '900',
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                WELCOME PATHSEEKER
              </Text>

              <GradientText
                colors={Gradients.primaryButton}
                style={{
                  fontSize: 22,
                  fontWeight: '900',
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                }}
              >
                FOCUS SESSION
              </GradientText>

              <Text
                style={{
                  fontSize: 11,
                  color: '#9CA3AF',
                  marginTop: 8,
                  lineHeight: 16,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}
              >
                ALL DAILY TASKS SECURED.{'\n'}KEEP GROWING STREAKS!
              </Text>

              {/* Status indicator */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 12,
                  gap: 6,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#10B981',
                  }}
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '800',
                    color: '#10B981',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                  }}
                >
                  FOCUSED
                </Text>
              </View>
            </View>

            {/* Right avatar */}
            <AvatarMonogram
              name={displayName}
              size={56}
              showRing={isSubscribed}
            />
          </View>
        </LinearGradient>
      </FadeInView>

      {/* ── 2. Metrics Row ──────────────────────────────────────────── */}
      <FadeInView delay={100} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <MetricCard
            icon="🪙"
            label="TOKENS"
            value={tokensBalance}
            accentColor={C.amber}
          />
          <MetricCard
            icon="🔥"
            label="STREAK"
            value={`${streak} DAYS`}
            accentColor={C.orange}
          />
          <MetricCard
            icon="⚡"
            label="LEVEL"
            value={`LVL ${level}`}
            accentColor={C.electricBlue}
          />
        </View>
      </FadeInView>

      {/* ── 3. XP Progress ──────────────────────────────────────────── */}
      <FadeInView delay={200}>
        <GlassCard elevated>
          {/* Header row */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: '#FFFFFF',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              EXPERIENCE POINTS
            </Text>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '900',
                color: C.inactive,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              {xp} / 1000 XP
            </Text>
          </View>

          {/* Progress bar */}
          <AnimatedProgressBar
            progress={xpProgress}
            colors={Gradients.xpBar}
          />

          {/* Rank title */}
          <Text
            style={{
              fontSize: 10,
              fontWeight: '800',
              color: C.neonViolet,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginTop: 12,
              textAlign: 'center',
            }}
          >
            ✦ {getRankTitle(level)} ✦
          </Text>
        </GlassCard>
      </FadeInView>
    </ScrollView>
  );
}
