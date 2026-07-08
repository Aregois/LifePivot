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
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase';
import { C, Gradients, Shadows } from '../../constants/theme';
import {
  FadeInView,
  GlassCard,
  GradientText,
  AnimatedProgressBar,
  MetricCard,
  AvatarMonogram,
  PremiumButton,
} from '../../components/ui';

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
  const router = useRouter();
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050508' }}>
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
    <View style={{ flex: 1, backgroundColor: '#050508' }}>
      {/* Background Ambient Glows */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: '#00F0FF',
          opacity: 0.05,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 120,
          left: -100,
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: '#BD00FF',
          opacity: 0.05,
        }}
      />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchProfile}
            tintColor="#00F0FF"
          />
        }
        className="flex-1"
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
                  letterSpacing: 3.5,
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
                  letterSpacing: -0.5,
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

      {level < 2 ? (
        <FadeInView delay={100}>
          <GlassCard elevated style={{ alignItems: 'center', padding: 24, marginTop: 12 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(0, 240, 255, 0.05)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(0, 240, 255, 0.15)',
                marginBottom: 16,
              }}
            >
              <Ionicons name="lock-closed" size={28} color="#00F0FF" />
            </View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '900',
                color: '#FFFFFF',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              Next Checkpoint
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: '#9CA3AF',
                textAlign: 'center',
                lineHeight: 18,
                marginBottom: 20,
              }}
            >
              Complete your first study milestone to unlock your dashboard.
            </Text>

            {/* Progress bar to Level 2 (1000 XP) */}
            <View style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Progress to Level 2</Text>
                <Text style={{ fontSize: 11, fontWeight: '900', color: C.electricBlue }}>{xp} / 1000 XP</Text>
              </View>
              <AnimatedProgressBar
                progress={xpProgress}
                colors={Gradients.xpBar}
              />
            </View>

            <PremiumButton
              title="GO TO PLANS"
              onPress={() => router.push('/plan')}
              variant="primary"
              style={{ width: '100%' }}
            />
          </GlassCard>
        </FadeInView>
      ) : (
        <>
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
                    letterSpacing: -0.5, // tracking-tight
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
                    letterSpacing: 2, // micro-label style
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
        </>
      )}
      </ScrollView>
    </View>
  );
}
