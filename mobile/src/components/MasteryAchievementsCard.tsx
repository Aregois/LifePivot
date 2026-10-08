import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, Gradients, Shadows } from '../constants/theme';
import { GlassCard, GlowBadge, AnimatedProgressBar } from './ui';
import { supabase } from '../utils/supabase';
import { storage as SecureStore } from '../utils/storage';
import { HapticsEngine } from '../utils/HapticsEngine';

export interface AchievementItem {
  id: 'first_focus' | 'recall_master' | 'deep_learner' | 'streak_starter';
  title: string;
  description: string;
  xpReward: number;
  tokenReward: number;
  icon: keyof typeof Ionicons.glyphMap;
  colorScheme: 'emerald' | 'amber' | 'violet' | 'blue';
  accentColor: string;
  unlocked: boolean;
  progress: number; // 0 to 1
  progressLabel: string;
}

interface MasteryAchievementsCardProps {
  totalCompleted: number;
  hasReflection: boolean;
  p5Completed: number;
  currentStreak: number;
  profile: any;
  onProfileUpdate: (updatedProfile: any) => void;
}

const STORAGE_KEY_CLAIMED = 'lifepivot_claimed_achievements';

export const MasteryAchievementsCard: React.FC<MasteryAchievementsCardProps> = ({
  totalCompleted,
  hasReflection,
  p5Completed,
  currentStreak,
  profile,
  onProfileUpdate,
}) => {
  const [claimedIds, setClaimedIds] = useState<string[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Load claimed achievements from SecureStore
  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY_CLAIMED).then((data) => {
      if (data) {
        try {
          setClaimedIds(JSON.parse(data));
        } catch {
          setClaimedIds([]);
        }
      }
    });
  }, []);

  const achievements: AchievementItem[] = [
    {
      id: 'first_focus',
      title: 'First Focus',
      description: 'Complete your first task focus session.',
      xpReward: 20,
      tokenReward: 3,
      icon: 'checkmark-circle-outline',
      colorScheme: 'emerald',
      accentColor: C.emerald,
      unlocked: totalCompleted >= 1,
      progress: Math.min(1, totalCompleted / 1),
      progressLabel: `${Math.min(1, totalCompleted)}/1 TASK`,
    },
    {
      id: 'recall_master',
      title: 'Feynman Apprentice',
      description: 'Pass your first Socratic active recall quiz.',
      xpReward: 30,
      tokenReward: 5,
      icon: 'school-outline',
      colorScheme: 'amber',
      accentColor: C.amber,
      unlocked: hasReflection,
      progress: hasReflection ? 1 : 0,
      progressLabel: hasReflection ? '1/1 PASSED' : '0/1 DRILL',
    },
    {
      id: 'deep_learner',
      title: 'Deep Learner',
      description: 'Complete a P5 (Deep Theory) cognitive task.',
      xpReward: 40,
      tokenReward: 8,
      icon: 'sparkles-outline',
      colorScheme: 'violet',
      accentColor: C.neonViolet,
      unlocked: p5Completed >= 1,
      progress: Math.min(1, p5Completed / 1),
      progressLabel: `${Math.min(1, p5Completed)}/1 P5 TASK`,
    },
    {
      id: 'streak_starter',
      title: 'Streak Starter',
      description: 'Maintain a 3-day study completion streak.',
      xpReward: 50,
      tokenReward: 10,
      icon: 'flame-outline',
      colorScheme: 'blue',
      accentColor: C.electricBlue,
      unlocked: currentStreak >= 3,
      progress: Math.min(1, currentStreak / 3),
      progressLabel: `${Math.min(3, currentStreak)}/3 DAYS`,
    },
  ];

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const allClaimed = achievements.every((a) => claimedIds.includes(a.id));

  const handleClaim = async (achievement: AchievementItem) => {
    if (claimedIds.includes(achievement.id) || !achievement.unlocked || claimingId) {
      return;
    }

    setClaimingId(achievement.id);
    HapticsEngine.tier2.action();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch fresh profile
      const { data: freshProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const currentProfile = freshProfile || profile || { tokens_balance: 0, xp: 0, level: 1 };

      // Real leveling progression math
      let newXp = (currentProfile.xp ?? 0) + achievement.xpReward;
      let newLevel = currentProfile.level ?? 1;
      let xpNeeded = newLevel * 100;
      while (newXp >= xpNeeded) {
        newXp -= xpNeeded;
        newLevel += 1;
        xpNeeded = newLevel * 100;
      }
      const newTokens = (currentProfile.tokens_balance ?? 0) + achievement.tokenReward;

      // Update in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          tokens_balance: newTokens,
          xp: newXp,
          level: newLevel,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update claimed IDs locally and in SecureStore
      const updatedClaimed = [...claimedIds, achievement.id];
      setClaimedIds(updatedClaimed);
      await SecureStore.setItemAsync(STORAGE_KEY_CLAIMED, JSON.stringify(updatedClaimed));

      const updatedProfileState = {
        ...currentProfile,
        tokens_balance: newTokens,
        xp: newXp,
        level: newLevel,
      };
      onProfileUpdate(updatedProfileState);

      HapticsEngine.tier3.celebrate();
      Alert.alert(
        'REWARD CLAIMED! ✦',
        `+${achievement.xpReward} XP & +${achievement.tokenReward} Tokens credited to your vault.`
      );
    } catch (err: any) {
      HapticsEngine.tier4.error();
      Alert.alert('CLAIM FAILED', err.message || 'Could not claim reward');
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CLAIMABLE ACHIEVEMENTS</Text>
        <GlowBadge
          label={allClaimed ? '100% MASTERY' : `${unlockedCount}/4 UNLOCKED`}
          colorScheme={allClaimed ? 'emerald' : 'violet'}
          glow={allClaimed}
        />
      </View>

      {/* Matrix Cards */}
      <View style={styles.grid}>
        {achievements.map((item) => {
          const isClaimed = claimedIds.includes(item.id);
          const isClaimable = item.unlocked && !isClaimed;
          const isClaimingThis = claimingId === item.id;

          return (
            <GlassCard key={item.id} style={styles.card}>
              <View style={styles.topRow}>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      borderColor: item.unlocked ? item.accentColor : 'rgba(255, 255, 255, 0.1)',
                      backgroundColor: item.unlocked
                        ? `${item.accentColor}1A`
                        : 'rgba(255, 255, 255, 0.02)',
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={item.unlocked ? item.accentColor : C.textDim}
                  />
                </View>

                <View style={styles.infoCol}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.title, item.unlocked && { color: '#FFFFFF' }]}>
                      {item.title}
                    </Text>
                    <Text style={styles.progressLabel}>{item.progressLabel}</Text>
                  </View>
                  <Text style={styles.description}>{item.description}</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={{ marginVertical: 8 }}>
                <AnimatedProgressBar
                  progress={item.progress}
                  color={item.accentColor}
                  height={4}
                />
              </View>

              {/* Bottom Actions / Reward info */}
              <View style={styles.bottomRow}>
                <View style={styles.rewardsRow}>
                  <GlowBadge label={`+${item.xpReward} XP`} colorScheme="blue" />
                  <GlowBadge label={`+${item.tokenReward} TOKENS`} colorScheme="amber" />
                </View>

                {isClaimed ? (
                  <View style={styles.claimedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={C.emerald} />
                    <Text style={styles.claimedText}>CLAIMED</Text>
                  </View>
                ) : isClaimable ? (
                  <TouchableOpacity
                    onPress={() => handleClaim(item)}
                    disabled={!!claimingId}
                    style={[styles.claimButton, { backgroundColor: item.accentColor }]}
                  >
                    {isClaimingThis ? (
                      <ActivityIndicator size="small" color="#050508" />
                    ) : (
                      <Text style={styles.claimButtonText}>CLAIM REWARD</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.lockedBadge}>
                    <Ionicons name="lock-closed-outline" size={12} color={C.textDim} />
                    <Text style={styles.lockedText}>LOCKED</Text>
                  </View>
                )}
              </View>
            </GlassCard>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: C.neonViolet,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  grid: {
    gap: 12,
  },
  card: {
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
    color: C.textDim,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  progressLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: C.textDim,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 11,
    color: C.textDim,
    marginTop: 2,
    lineHeight: 15,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  claimButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#050508',
    letterSpacing: 0.8,
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  claimedText: {
    fontSize: 9,
    fontWeight: '900',
    color: C.emerald,
    letterSpacing: 1,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lockedText: {
    fontSize: 9,
    fontWeight: '800',
    color: C.textDim,
    letterSpacing: 0.5,
  },
});
