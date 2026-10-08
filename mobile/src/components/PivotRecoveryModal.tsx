import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticsEngine } from '../utils/HapticsEngine';
import { supabase } from '../utils/supabase';
import { C, Gradients } from '../constants/theme';
import { GlassCard, GradientText, PremiumButton, GlowBadge } from './ui';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface PivotRecoveryModalProps {
  visible: boolean;
  onClose: () => void;
  overdueCount?: number;
  availableVoidDays?: number;
  userTokens?: number;
  hasStreakShield?: boolean;
  onPivotCompleted?: (tier: number) => void;
}

function getLocalDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const TIER_TOKEN_COSTS = {
  1: 0,   // Shift into Void Days: Free (0 Tokens)
  2: 10,  // AI Crunch Compression: 10 Tokens
  3: 0,   // Avalanche Consolidation: Free Emergency (0 Tokens)
};

export const PivotRecoveryModal: React.FC<PivotRecoveryModalProps> = ({
  visible,
  onClose,
  overdueCount: initialOverdueCount = 0,
  availableVoidDays = 2,
  userTokens: initialTokens = 0,
  hasStreakShield = false,
  onPivotCompleted,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [tokens, setTokens] = useState<number>(initialTokens);
  const [overdueTasks, setOverdueTasks] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      loadUserData();
    }
  }, [visible]);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = getLocalDateString();
      const [profRes, tasksRes] = await Promise.all([
        supabase.from('profiles').select('tokens_balance').eq('id', user.id).single(),
        supabase.from('tasks').select('*').eq('user_id', user.id).eq('status', 'pending').lt('due_date', today),
      ]);

      if (profRes.data) {
        setTokens(profRes.data.tokens_balance ?? 0);
      }
      if (tasksRes.data) {
        setOverdueTasks(tasksRes.data);
      }
    } catch (e) {
      console.warn('Error loading pivot modal data:', e);
    }
  };

  const overdueCount = overdueTasks.length || initialOverdueCount;

  const handleExecutePivot = async (tier: number) => {
    const cost = TIER_TOKEN_COSTS[tier as keyof typeof TIER_TOKEN_COSTS] || 0;

    if (cost > 0 && tokens < cost) {
      HapticsEngine.tier4.error();
      Alert.alert(
        'INSUFFICIENT TOKENS',
        `You need ${cost} Tokens to execute this Pivot tier. You currently have ${tokens} Tokens. Complete focus sessions or micro-drills to earn more tokens!`,
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    setSelectedTier(tier);
    HapticsEngine.tier3.success();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = getLocalDateString();

      // Fetch fresh overdue tasks
      const { data: tasksToReschedule } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .lt('due_date', today);

      const list = tasksToReschedule || overdueTasks;

      // 1. Deduct tokens if applicable
      if (cost > 0) {
        const newBalance = Math.max(0, tokens - cost);
        setTokens(newBalance);
        await supabase
          .from('profiles')
          .update({ tokens_balance: newBalance })
          .eq('id', user.id);
      }

      // 2. Perform Rescheduling Algorithm
      if (tier === 1) {
        // T1: Shift forward into next open days / tomorrow (+1 day)
        for (let i = 0; i < list.length; i++) {
          const task = list[i];
          const shiftedDate = addDays(today, 1 + (i % 2));
          await supabase
            .from('tasks')
            .update({
              due_date: shiftedDate,
              pivoted_count: (task.pivoted_count || 0) + 1,
            })
            .eq('id', task.id);
        }
      } else if (tier === 2) {
        // T2: AI Crunch - Compress & absorb across next 3 days evenly (max 3/day)
        for (let i = 0; i < list.length; i++) {
          const task = list[i];
          const targetOffset = i % 3; // Spread over today, tomorrow, +2 days
          const targetDate = addDays(today, targetOffset);
          await supabase
            .from('tasks')
            .update({
              due_date: targetDate,
              pivoted_count: (task.pivoted_count || 0) + 1,
            })
            .eq('id', task.id);
        }
      } else if (tier === 3) {
        // T3: Avalanche - Consolidate all debt onto Today
        for (let i = 0; i < list.length; i++) {
          const task = list[i];
          await supabase
            .from('tasks')
            .update({
              due_date: today,
              pivoted_count: (task.pivoted_count || 0) + 1,
            })
            .eq('id', task.id);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (e) {
      console.error('Failed to execute Pivot reschedule:', e);
      HapticsEngine.tier4.error();
    } finally {
      setLoading(false);
      if (onPivotCompleted) onPivotCompleted(tier);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerSubtitle, { color: colors.primary }]}>PLAN RECOVERY ENGINE</Text>
            <Text numberOfLines={1} style={styles.headerTitle}>
              3-TIER PIVOT RESCHEDULE
            </Text>
          </View>
          <View style={[styles.tokenHeaderBadge, { borderColor: `${colors.amber}44`, backgroundColor: `${colors.amber}18` }]}>
            <Ionicons name="sparkles" size={13} color={colors.amber} />
            <Text style={[styles.tokenHeaderText, { color: colors.amber }]}>{tokens}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Overdue Warning Card */}
          <GlassCard elevated style={[styles.warningCard, { borderColor: colors.glassBorder }]}>
            <Ionicons name="warning-outline" size={36} color={colors.amber} />
            <Text style={styles.warningTitle}>TIMELINE FRACTURE DETECTED</Text>
            <Text style={styles.warningSub}>
              You have {overdueCount} overdue task(s). Execute a Pivot to re-align your daily study schedule using your earned tokens.
            </Text>

            {hasStreakShield && (
              <View style={styles.shieldBadge}>
                <Ionicons name="shield-checkmark" size={14} color={colors.emerald} />
                <Text style={[styles.shieldText, { color: colors.emerald }]}>STREAK SHIELD EQUIPPED · STREAK PROTECTED</Text>
              </View>
            )}
          </GlassCard>

          {/* Tier Options */}
          <View style={styles.tierContainer}>
            {/* Tier 1 */}
            <GlassCard elevated style={[styles.tierCard, { borderColor: colors.glassBorder }]}>
              <View style={styles.tierHeader}>
                <View style={[styles.tierNumBox, { backgroundColor: `${colors.primary}18` }]}>
                  <Text style={[styles.tierNumText, { color: colors.primary }]}>T1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tierTitle}>THE SHIFT</Text>
                  <Text style={styles.tierSub}>Push schedule forward into future Void Days</Text>
                </View>
                <GlowBadge label="0 TOKENS" colorScheme="blue" />
              </View>
              <Text style={styles.tierDetailText}>
                ✦ Free (0 Tokens) · Shifts tasks into scheduled rest days without compressing topic coverage.
              </Text>
              <PremiumButton
                title="EXECUTE TIER 1 SHIFT (FREE)"
                onPress={() => handleExecutePivot(1)}
                loading={loading && selectedTier === 1}
                disabled={loading}
                variant="primary"
                style={{ marginTop: 12, width: '100%' }}
              />
            </GlassCard>

            {/* Tier 2 */}
            <GlassCard elevated style={[styles.tierCard, { borderColor: colors.glassBorder }]}>
              <View style={styles.tierHeader}>
                <View style={[styles.tierNumBox, { backgroundColor: `${colors.amber}18` }]}>
                  <Text style={[styles.tierNumText, { color: colors.amber }]}>T2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tierTitle}>THE CRUNCH</Text>
                  <Text style={styles.tierSub}>Compress & absorb into adjacent study days</Text>
                </View>
                <GlowBadge label="10 TOKENS" colorScheme="amber" glow />
              </View>
              <Text style={styles.tierDetailText}>
                ✦ Costs 10 Tokens · Absorbs overdue tasks across adjacent days (Max 3/day) without extending final target date.
              </Text>
              <PremiumButton
                title={tokens >= 10 ? 'EXECUTE TIER 2 CRUNCH (10 TOKENS)' : 'INSUFFICIENT TOKENS (10 NEEDED)'}
                onPress={() => handleExecutePivot(2)}
                loading={loading && selectedTier === 2}
                disabled={loading || tokens < 10}
                variant="ghost"
                style={{ marginTop: 12, width: '100%' }}
              />
            </GlassCard>

            {/* Tier 3 */}
            <GlassCard elevated style={[styles.tierCard, { borderColor: colors.glassBorder }]}>
              <View style={styles.tierHeader}>
                <View style={[styles.tierNumBox, { backgroundColor: `${colors.rose}18` }]}>
                  <Text style={[styles.tierNumText, { color: colors.rose }]}>T3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tierTitle}>THE AVALANCHE</Text>
                  <Text style={styles.tierSub}>Collapse debt & consolidate all items onto Today</Text>
                </View>
                <GlowBadge label="0 TOKENS" colorScheme="violet" />
              </View>
              <Text style={styles.tierDetailText}>
                ✦ Free (0 Tokens) · Emergency fallback that collapses all overdue tasks directly onto Today for immediate catch-up.
              </Text>
              <PremiumButton
                title="EXECUTE AVALANCHE DUMP (FREE)"
                onPress={() => handleExecutePivot(3)}
                loading={loading && selectedTier === 3}
                disabled={loading}
                variant="destructive"
                style={{ marginTop: 12, width: '100%' }}
              />
            </GlassCard>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050508',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tokenHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  tokenHeaderText: {
    fontSize: 12,
    fontWeight: '900',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 60,
  },
  warningCard: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 6,
  },
  warningSub: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginTop: 14,
  },
  shieldText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tierContainer: {
    gap: 16,
  },
  tierCard: {
    padding: 18,
    borderRadius: 20,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  tierNumBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierNumText: {
    fontSize: 12,
    fontWeight: '900',
  },
  tierTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  tierSub: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  tierDetailText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    lineHeight: 15,
    marginBottom: 4,
  },
});

export default PivotRecoveryModal;

