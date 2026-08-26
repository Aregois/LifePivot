import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { HapticsEngine } from '../../utils/HapticsEngine';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { FadeInView, GlassCard, PremiumButton, SegmentedControl } from '../../components/ui';
import { apiRequest } from '../../utils/api';
import { PlanGeneratorLoader } from '../../components/plan/PlanGeneratorLoader';
import { scheduleDailyStudyReminder, requestNotificationPermissions } from '../../utils/notifications';
import { supabase } from '../../utils/supabase';
import { track } from '../../utils/analytics';
import { BorderRadius } from '../../constants/theme';

const CATEGORY_IDS = [
  { id: 'Coding', icon: 'code-slash' },
  { id: 'Science', icon: 'flask' },
  { id: 'Math', icon: 'calculator' },
  { id: 'Languages', icon: 'language' },
  { id: 'Humanities', icon: 'book' },
  { id: 'Arts', icon: 'color-palette' },
  { id: 'Business', icon: 'briefcase' },
  { id: 'Music', icon: 'musical-notes' },
  { id: 'History', icon: 'document-text' },
  { id: 'Social', icon: 'people' },
  { id: 'Health', icon: 'barbell' },
  { id: 'Custom', icon: 'sparkles' },
];

const DURATIONS = [7, 14, 30, 60];

export default function CreatePlan() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Coding');
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [levelIndex, setLevelIndex] = useState(0); // 0 = Beginner, 1 = Intermediate, 2 = Advanced
  const [selectedIntent, setSelectedIntent] = useState('Level Up');
  const [dailyHours, setDailyHours] = useState(2);

  // Generation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [planParams, setPlanParams] = useState<any>(null);

  const intents = [
    { id: 'Exam', label: t('creator.intent_exam'), desc: 'Syllabus coverage & dense pre-exam review' },
    { id: 'Level Up', label: t('creator.intent_mastery'), desc: 'Skill mastery loops with deep theory focus' },
    { id: 'Intro', label: t('creator.intent_intro'), desc: 'Interest building with low-pressure progress' },
  ];

  const handleCreate = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      HapticsEngine.tier4.warning();
      Alert.alert(t('common.error') || 'REQUIRED', t('onboarding.q1_title') || 'Please input a goal or topic title to proceed.');
      return;
    }

    HapticsEngine.tier2.action();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t('common.error') || 'ERROR', 'You must be logged in to create a plan.');
        return;
      }

      const levels = ['Beginner', 'Intermediate', 'Advanced'];
      const level = levels[levelIndex];

      setPlanParams({
        goal: trimmedTitle,
        level: level,
        dailyTime: dailyHours.toString() + ' hours',
        style: selectedCategory,
        userId: user.id,
      });
      setIsGenerating(true);
    } catch (err: any) {
      console.error('Error initiating generation:', err);
      Alert.alert(t('common.error') || 'ERROR', 'Failed to initiate plan generation.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* Ambient Background Glows */}
      <View
        pointerEvents="none"
        style={[
          styles.ambientGlowTop,
          { backgroundColor: colors.primary, opacity: 0.05 },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.ambientGlowBottom,
          { backgroundColor: colors.secondary, opacity: 0.04 },
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Category Chips Picker ── */}
        <FadeInView delay={0} style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>{t('creator.subtitle')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {CATEGORY_IDS.map((cat) => {
              const isSelected = cat.id === selectedCategory;
              const categoryName = t(`categories.${cat.id}.name`) || cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => {
                    HapticsEngine.tier1.selection();
                    setSelectedCategory(cat.id);
                  }}
                  style={[
                    styles.categoryChip,
                    {
                      borderColor: isSelected ? colors.primary : colors.glassBorder,
                      backgroundColor: isSelected ? `${colors.primary}18` : 'rgba(255, 255, 255, 0.03)',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={14}
                    color={isSelected ? colors.primary : colors.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      { color: isSelected ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {categoryName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </FadeInView>

        {/* ── Topic / Goal Title ── */}
        <FadeInView delay={100} style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>{t('creator.objective')}</Text>
          <GlassCard style={[styles.inputContainer, { borderColor: colors.glassBorder }]}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Master Quantum Mechanics & Systems Design"
              placeholderTextColor={colors.placeholder}
              style={[styles.textInput, { color: colors.textPrimary }]}
            />
          </GlassCard>
        </FadeInView>

        {/* ── Duration ── */}
        <FadeInView delay={150} style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>{t('creator.duration')}</Text>
          <View style={styles.durationRow}>
            {DURATIONS.map((dur) => {
              const isSelected = dur === selectedDuration;
              return (
                <TouchableOpacity
                  key={dur}
                  onPress={() => {
                    HapticsEngine.tier1.selection();
                    setSelectedDuration(dur);
                  }}
                  style={[
                    styles.durationButton,
                    {
                      borderColor: isSelected ? colors.primary : colors.glassBorder,
                      backgroundColor: isSelected ? `${colors.primary}18` : 'rgba(255, 255, 255, 0.03)',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.durationText,
                      { color: isSelected ? colors.primary : colors.textMuted },
                    ]}
                  >
                    {dur}D
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </FadeInView>

        {/* ── Level ── */}
        <FadeInView delay={200} style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>{t('creator.initial_level')}</Text>
          <SegmentedControl
            segments={[t('marketplace.beginner'), t('marketplace.intermediate'), t('marketplace.advanced')]}
            selectedIndex={levelIndex}
            onChange={setLevelIndex}
          />
        </FadeInView>

        {/* ── Mission Intent ── */}
        <FadeInView delay={250} style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>{t('creator.intent')}</Text>
          <View style={{ gap: 10 }}>
            {intents.map((intent) => {
              const isSelected = intent.id === selectedIntent;
              return (
                <GlassCard
                  key={intent.id}
                  onPress={() => {
                    HapticsEngine.tier1.selection();
                    setSelectedIntent(intent.id);
                  }}
                  style={[
                    styles.intentCard,
                    {
                      borderColor: isSelected ? colors.primary : colors.glassBorder,
                      backgroundColor: isSelected ? `${colors.primary}12` : colors.card,
                    },
                  ]}
                >
                  <View style={styles.intentHeader}>
                    <Text
                      style={[
                        styles.intentTitle,
                        isSelected && { color: colors.primary },
                      ]}
                    >
                      {intent.label.toUpperCase()}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
                  </View>
                  <Text style={[styles.intentDesc, { color: colors.textSecondary }]}>{intent.desc}</Text>
                </GlassCard>
              );
            })}
          </View>
        </FadeInView>

        {/* ── Commitment Budget ── */}
        <FadeInView delay={300} style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>{t('creator.daily_limit')}</Text>
          <View style={styles.hoursRow}>
            {[1, 2, 3, 4, 5, 6].map((hour) => {
              const isSelected = hour === dailyHours;
              return (
                <TouchableOpacity
                  key={hour}
                  onPress={() => {
                    HapticsEngine.tier1.selection();
                    setDailyHours(hour);
                  }}
                  style={[
                    styles.hourChip,
                    {
                      borderColor: isSelected ? colors.secondary : colors.glassBorder,
                      backgroundColor: isSelected ? `${colors.secondary}18` : 'rgba(255, 255, 255, 0.03)',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.hourChipText,
                      { color: isSelected ? colors.secondary : colors.textMuted },
                    ]}
                  >
                    {hour}H
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </FadeInView>

        {/* ── Generate Action Button ── */}
        <FadeInView delay={350} style={{ marginTop: 24, marginBottom: 40 }}>
          <PremiumButton
            title={t('creator.button_generate')}
            onPress={handleCreate}
            variant="primary"
          />
        </FadeInView>
      </ScrollView>

      <PlanGeneratorLoader
        visible={isGenerating}
        planParams={planParams}
        onDismiss={() => {
          setIsGenerating(false);
        }}
        onSuccess={async (goalId) => {
          setIsGenerating(false);
          try {
            const granted = await requestNotificationPermissions();
            if (granted) {
              const todayStr = new Date().toISOString().split('T')[0];
              const { count } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('goal_id', goalId)
                .eq('due_date', todayStr);

              const taskCount = count || 0;
              await scheduleDailyStudyReminder(title.trim(), 1, taskCount, 8, 0);
            }
          } catch (notiErr) {
            console.warn('Failed to register notifications:', notiErr);
          }

          const levels = ['Beginner', 'Intermediate', 'Advanced'];
          const level = levels[levelIndex];
          track('plan_created', {
            duration: selectedDuration,
            difficulty: level,
          });

          router.replace({
            pathname: '/plan/[id]',
            params: { id: goalId },
          });
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ambientGlowTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: 40,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  horizontalScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '800',
  },
  inputContainer: {
    padding: 4,
  },
  textInput: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationText: {
    fontSize: 12,
    fontWeight: '900',
  },
  intentCard: {
    padding: 14,
    borderWidth: 1,
  },
  intentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  intentTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  intentDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  hoursRow: {
    flexDirection: 'row',
    gap: 8,
  },
  hourChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  hourChipText: {
    fontSize: 11,
    fontWeight: '900',
  },
});
