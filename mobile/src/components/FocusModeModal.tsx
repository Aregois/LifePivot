import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { HapticsEngine } from '../utils/HapticsEngine';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { GlassCard, GlowBadge } from './ui';
import { SocraticChatModal, SocraticPersona } from './SocraticChatModal';
import { supabase } from '../utils/supabase';
import { apiRequest } from '../utils/api';
import { SoundscapesEngine, SOUNDSCAPE_PRESETS, SoundscapePreset } from '../utils/SoundscapesEngine';

const { width } = Dimensions.get('window');
const TIMER_SIZE = Math.min(width * 0.68, 260);
const STROKE_WIDTH = 12;
const RADIUS = (TIMER_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export type FocusTab = 'timer' | 'chat' | 'hints' | 'subtasks' | 'notes';

export interface SubtaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface FocusModeModalProps {
  visible: boolean;
  onClose: () => void;
  taskId?: string;
  taskTitle?: string;
  subject?: string;
  priority?: number;
  subtasks?: SubtaskItem[];
  notes?: string;
  aiHint?: string;
  initialMinutes?: number;
  onCompleteSession?: (completedMinutes: number) => void;
  onUpdateTask?: (updatedTask: any) => void;
}

const DURATION_OPTIONS = [15, 25, 45, 60];

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  5: { label: 'P5 CRITICAL', color: '#F43F5E' },
  4: { label: 'P4 HIGH', color: '#F97316' },
  3: { label: 'P3 MEDIUM', color: '#F59E0B' },
  2: { label: 'P2 LOW', color: '#00F0FF' },
  1: { label: 'P1 MINIMAL', color: '#6B7280' },
};

export const FocusModeModal: React.FC<FocusModeModalProps> = ({
  visible,
  onClose,
  taskId,
  taskTitle = 'Deep Study Focus',
  subject,
  priority = 3,
  subtasks: initialSubtasks = [],
  notes: initialNotes = '',
  aiHint: initialAiHint,
  initialMinutes = 25,
  onCompleteSession,
  onUpdateTask,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useLanguage();

  // Navigation within Focus Mode
  const [activeTab, setActiveTab] = useState<FocusTab>('timer');

  // Timer states
  const [selectedMinutes, setSelectedMinutes] = useState(initialMinutes);
  const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60);
  const [secondsRemaining, setSecondsRemaining] = useState(initialMinutes * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputText, setCustomInputText] = useState('');

  // Subtasks state
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>(initialSubtasks);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  // Notes state
  const [notes, setNotes] = useState(initialNotes);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Socratic Hint state
  const [hint, setHint] = useState<string | null>(initialAiHint || null);
  const [hintLoading, setHintLoading] = useState(false);
  const [persona, setPersona] = useState<SocraticPersona>('feynman');

  // Ambient Soundscapes state
  const [soundscape, setSoundscape] = useState<SoundscapePreset>('off');
  const [soundVolume, setSoundVolume] = useState<number>(0.7);

  // Sync audio with focus timer state
  useEffect(() => {
    if (!visible) {
      SoundscapesEngine.stop();
      return;
    }
    if (timerRunning && soundscape !== 'off' && soundscape !== 'none') {
      SoundscapesEngine.play(soundscape, soundVolume);
    } else if (!timerRunning) {
      SoundscapesEngine.pause();
    }
  }, [timerRunning, soundscape, soundVolume, visible]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      SoundscapesEngine.stop();
    };
  }, []);

  // Sync state when modal opens
  useEffect(() => {
    if (visible) {
      const mins = Math.max(1, initialMinutes);
      setSelectedMinutes(mins);
      setTotalSeconds(mins * 60);
      setSecondsRemaining(mins * 60);
      setTimerRunning(false);
      setShowCustomInput(false);
      setCustomInputText('');
      setActiveTab('timer');
      setSubtasks(initialSubtasks || []);
      setNotes(initialNotes || '');
      setSaveStatus('idle');

      // Load persona preference from SecureStore
      SecureStore.getItemAsync('lifepivot_persona')
        .then((saved) => {
          if (saved && (saved === 'feynman' || saved === 'socrates' || saved === 'stoic')) {
            setPersona(saved as SocraticPersona);
          }
        })
        .catch((err) => {
          console.warn('Failed to load persona in FocusModeModal:', err);
        });

      if (initialAiHint) {
        try {
          const parsed = JSON.parse(initialAiHint);
          setHint(parsed.general || parsed);
        } catch {
          setHint(initialAiHint);
        }
      } else {
        setHint(null);
      }
    } else {
      SoundscapesEngine.stop();
    }
  }, [initialMinutes, visible, initialSubtasks, initialNotes, initialAiHint]);

  // Breathing ring animation for immersive focus
  const breathingScale = useSharedValue(1);
  const breathingOpacity = useSharedValue(0.12);

  useEffect(() => {
    if (timerRunning) {
      breathingScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 2400 }),
          withTiming(1.0, { duration: 2400 })
        ),
        -1,
        true
      );
      breathingOpacity.value = withRepeat(
        withSequence(
          withTiming(0.28, { duration: 2400 }),
          withTiming(0.12, { duration: 2400 })
        ),
        -1,
        true
      );
    } else {
      breathingScale.value = withTiming(1.0, { duration: 400 });
      breathingOpacity.value = withTiming(0.1, { duration: 400 });
    }
  }, [timerRunning, breathingScale, breathingOpacity]);

  const breathingHaloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathingScale.value }],
    opacity: breathingOpacity.value,
  }));

  // Main countdown timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (timerRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            return 0;
          }
          if (prev <= 4 && prev > 1) {
            HapticsEngine.tier1.tick();
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, secondsRemaining]);

  // Handle timer completion
  useEffect(() => {
    if (timerRunning && secondsRemaining === 0) {
      setTimerRunning(false);
      SoundscapesEngine.stop();
      HapticsEngine.tier3.celebrate();
      const elapsedMinutes = Math.max(1, Math.round((totalSeconds - secondsRemaining) / 60));
      if (onCompleteSession) {
        onCompleteSession(elapsedMinutes);
      }
    }
  }, [timerRunning, secondsRemaining, totalSeconds, onCompleteSession]);

  /* ────────────────────────────────────────────────────────────────────────── */
  /*  Timer Controls                                                            */
  /* ────────────────────────────────────────────────────────────────────────── */

  const handleStartPause = () => {
    HapticsEngine.tier2.toggle();
    setTimerRunning((prev) => !prev);
  };

  const handleReset = () => {
    HapticsEngine.tier1.light();
    setTimerRunning(false);
    setSecondsRemaining(totalSeconds);
  };

  const handleSelectPreset = (mins: number) => {
    HapticsEngine.tier1.selection();
    setSelectedMinutes(mins);
    setTotalSeconds(mins * 60);
    setSecondsRemaining(mins * 60);
    setTimerRunning(false);
    setShowCustomInput(false);
  };

  const handleAddFiveMinutes = () => {
    HapticsEngine.tier1.light();
    setTotalSeconds((prev) => prev + 300);
    setSecondsRemaining((prev) => prev + 300);
  };

  const handleApplyCustomMinutes = () => {
    const mins = parseInt(customInputText, 10);
    if (!isNaN(mins) && mins > 0 && mins <= 180) {
      HapticsEngine.tier1.selection();
      setSelectedMinutes(mins);
      setTotalSeconds(mins * 60);
      setSecondsRemaining(mins * 60);
      setTimerRunning(false);
      setShowCustomInput(false);
      setCustomInputText('');
    } else {
      HapticsEngine.tier4.warning();
      Alert.alert('INVALID DURATION', 'Please enter a duration between 1 and 180 minutes.');
    }
  };

  const handleClose = () => {
    if (timerRunning) {
      HapticsEngine.tier2.medium();
      Alert.alert(
        'EXIT FOCUS SESSION?',
        'Your focus timer is currently running. Exiting now will cancel this session.',
        [
          { text: 'RESUME FOCUS', style: 'cancel' },
          {
            text: 'EXIT SESSION',
            style: 'destructive',
            onPress: () => {
              setTimerRunning(false);
              SoundscapesEngine.stop();
              onClose();
            },
          },
        ]
      );
    } else {
      HapticsEngine.tier1.light();
      SoundscapesEngine.stop();
      onClose();
    }
  };

  /* ────────────────────────────────────────────────────────────────────────── */
  /*  Subtasks Handling                                                         */
  /* ────────────────────────────────────────────────────────────────────────── */

  const handleToggleSubtask = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = subtasks.map((st) =>
      st.id === id ? { ...st, completed: !st.completed } : st
    );
    setSubtasks(updated);

    if (taskId) {
      try {
        await supabase.from('tasks').update({ subtasks: updated }).eq('id', taskId);
        onUpdateTask?.({ id: taskId, subtasks: updated });
      } catch (err) {
        console.warn('Failed to update subtasks in FocusMode:', err);
      }
    }
  };

  const handleAddSubtask = async () => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSt: SubtaskItem = {
      id: `st-${Date.now()}`,
      title: trimmed,
      completed: false,
    };
    const updated = [...subtasks, newSt];
    setSubtasks(updated);
    setNewSubtaskTitle('');
    setIsAddingSubtask(false);

    if (taskId) {
      try {
        await supabase.from('tasks').update({ subtasks: updated }).eq('id', taskId);
        onUpdateTask?.({ id: taskId, subtasks: updated });
      } catch (err) {
        console.warn('Failed to add subtask in FocusMode:', err);
      }
    }
  };

  /* ────────────────────────────────────────────────────────────────────────── */
  /*  Notes Handling                                                            */
  /* ────────────────────────────────────────────────────────────────────────── */

  const handleNotesChange = (text: string) => {
    setNotes(text);
    setSaveStatus('saving');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (taskId) {
        try {
          await supabase.from('tasks').update({ notes: text }).eq('id', taskId);
          setSaveStatus('saved');
          onUpdateTask?.({ id: taskId, notes: text });
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (e) {
          setSaveStatus('idle');
        }
      } else {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    }, 800);
  };

  /* ────────────────────────────────────────────────────────────────────────── */
  /*  Socratic Hint Generation                                                  */
  /* ────────────────────────────────────────────────────────────────────────── */

  const handleFetchHint = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHintLoading(true);

    try {
      if (taskId) {
        const res = await apiRequest('/api/tasks/hint', {
          method: 'POST',
          body: JSON.stringify({ taskId, persona }),
        });
        if (res?.hint) {
          setHint(res.hint);
          return;
        }
      }
    } catch (err) {
      console.warn('Error fetching Socratic hint from backend:', err);
    } finally {
      setHintLoading(false);
    }

    // Fallback heuristic if offline
    const fallback =
      persona === 'feynman'
        ? `To master "${taskTitle}", imagine explaining it to a middle school student. What simple analogy describes its central function? Write that down first.`
        : persona === 'socrates'
        ? `Examine "${taskTitle}": What is the single most critical premise of this topic, and what evidence supports it?`
        : `Eliminate all non-essential noise. For the next focus sprint on "${taskTitle}", commit to finishing one concrete step without distraction.`;

    setHint(fallback);
  };

  /* ────────────────────────────────────────────────────────────────────────── */
  /*  Formatting & Visuals                                                      */
  /* ────────────────────────────────────────────────────────────────────────── */

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progress = totalSeconds > 0 ? (totalSeconds - secondsRemaining) / totalSeconds : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const prioMeta = PRIORITY_LABELS[priority] || PRIORITY_LABELS[3];
  const completedSubtasksCount = subtasks.filter((s) => s.completed).length;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 20) }]}>
        {/* Background Ambient Glows */}
        <View
          pointerEvents="none"
          style={[styles.ambientGlowTop, { backgroundColor: colors.primary }]}
        />
        <View
          pointerEvents="none"
          style={[styles.ambientGlowBottom, { backgroundColor: colors.secondary }]}
        />

        {/* Top Navigation & Task Banner */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <View style={styles.focusLabelRow}>
              <View style={[styles.pulseDot, { backgroundColor: timerRunning ? colors.emerald : colors.primary }]} />
              <Text style={[styles.focusLabel, { color: colors.primary }]}>
                {timerRunning ? t('focus.focusing') || 'ACTIVE FOCUS SESSION' : t('dashboard.focus_session') || 'DEEP FOCUS ARENA'}
              </Text>
            </View>
            <Text style={styles.taskTitleHeader} numberOfLines={1}>
              {taskTitle}
            </Text>
            <View style={styles.metaRow}>
              {subject && <GlowBadge label={subject} colorScheme="violet" />}
              <View style={[styles.prioPill, { borderColor: prioMeta.color }]}>
                <View style={[styles.prioDot, { backgroundColor: prioMeta.color }]} />
                <Text style={[styles.prioText, { color: prioMeta.color }]}>{prioMeta.label}</Text>
              </View>
              <Text style={styles.durationPill}>⏳ {Math.round(totalSeconds / 60)} MINS</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* In-Session Tool Switcher Tabs */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('timer');
            }}
            style={[styles.tabBtn, activeTab === 'timer' && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}
          >
            <Ionicons name="timer-outline" size={14} color={activeTab === 'timer' ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabBtnText, activeTab === 'timer' && { color: colors.primary, fontWeight: '900' }]}>
              {t('focus.timer_tab') || 'TIMER'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('chat');
            }}
            style={[styles.tabBtn, activeTab === 'chat' && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={activeTab === 'chat' ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabBtnText, activeTab === 'chat' && { color: colors.primary, fontWeight: '900' }]}>
              {t('nav.tutor') || 'SOCRATIC TUTOR'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('hints');
            }}
            style={[styles.tabBtn, activeTab === 'hints' && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}
          >
            <Ionicons name="bulb-outline" size={14} color={activeTab === 'hints' ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabBtnText, activeTab === 'hints' && { color: colors.primary, fontWeight: '900' }]}>
              {t('focus.socratic_reflection_hint') || 'HINTS'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('subtasks');
            }}
            style={[styles.tabBtn, activeTab === 'subtasks' && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}
          >
            <Ionicons name="checkbox-outline" size={14} color={activeTab === 'subtasks' ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabBtnText, activeTab === 'subtasks' && { color: colors.primary, fontWeight: '900' }]}>
              {t('focus.checklist_progress') || 'SUBTASKS'} ({completedSubtasksCount}/{subtasks.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content Display */}
        {activeTab === 'timer' && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            style={{ flex: 1 }}
          >
            {/* SVG Circular Progress Ring with Breathing Halo */}
            <View style={styles.timerCircleWrapper}>
              {/* Synchronized Breathing Halo Glow */}
              <Animated.View
                style={[
                  styles.breathingHalo,
                  {
                    backgroundColor: colors.primary,
                    width: TIMER_SIZE + 24,
                    height: TIMER_SIZE + 24,
                    borderRadius: (TIMER_SIZE + 24) / 2,
                  },
                  breathingHaloStyle,
                ]}
                pointerEvents="none"
              />

              <Svg width={TIMER_SIZE} height={TIMER_SIZE} style={styles.svgContainer}>
                <Defs>
                  <SvgLinearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={colors.primary} />
                    <Stop offset="100%" stopColor={colors.secondary} />
                  </SvgLinearGradient>
                </Defs>

                {/* Track background */}
                <Circle
                  cx={TIMER_SIZE / 2}
                  cy={TIMER_SIZE / 2}
                  r={RADIUS}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                />

                {/* Animated active stroke */}
                <Circle
                  cx={TIMER_SIZE / 2}
                  cy={TIMER_SIZE / 2}
                  r={RADIUS}
                  stroke="url(#timerGrad)"
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                  transform={`rotate(-90 ${TIMER_SIZE / 2} ${TIMER_SIZE / 2})`}
                />
              </Svg>

              {/* Time Display in Circle */}
              <View style={styles.timeTextOverlay}>
                <Text style={styles.countdownText}>{formatTime(secondsRemaining)}</Text>
                <Text style={[styles.statusText, { color: timerRunning ? colors.emerald : colors.primary }]}>
                  {timerRunning ? t('focus.focusing') || 'FOCUSING' : t('focus.ready') || 'READY TO START'}
                </Text>
              </View>
            </View>

            {/* Main Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={handleStartPause}
                style={[
                  styles.playPauseBtn,
                  { backgroundColor: timerRunning ? colors.amber : colors.primary },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={timerRunning ? 'pause' : 'play'}
                  size={24}
                  color="#050508"
                />
                <Text style={styles.playPauseBtnText}>
                  {timerRunning ? t('focus.pause_btn') || 'PAUSE SESSION' : t('focus.start_session_btn') || 'START FOCUS'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAddFiveMinutes}
                style={styles.addFiveBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={[styles.addFiveBtnText, { color: colors.primary }]}>+5 MIN</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleReset}
                style={styles.resetBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Presets & Custom Duration */}
            {!timerRunning && (
              <View style={styles.presetsSection}>
                <Text style={styles.presetLabel}>{t('focus.focus_minutes') || 'PRESET DURATIONS'}</Text>
                <View style={styles.presetPillsRow}>
                  {DURATION_OPTIONS.map((mins) => {
                    const isSelected = selectedMinutes === mins && !showCustomInput;
                    return (
                      <TouchableOpacity
                        key={mins}
                        onPress={() => handleSelectPreset(mins)}
                        style={[
                          styles.presetPill,
                          isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                      >
                        <Text style={[styles.presetPillText, isSelected && { color: '#050508', fontWeight: '900' }]}>
                          {mins}M
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    onPress={() => setShowCustomInput(!showCustomInput)}
                    style={[styles.presetPill, showCustomInput && { borderColor: colors.primary }]}
                  >
                    <Text style={[styles.presetPillText, showCustomInput && { color: colors.primary }]}>
                      CUSTOM
                    </Text>
                  </TouchableOpacity>
                </View>

                {showCustomInput && (
                  <View style={styles.customInputRow}>
                    <TextInput
                      style={styles.customInput}
                      placeholder="Minutes (1-180)"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="number-pad"
                      value={customInputText}
                      onChangeText={setCustomInputText}
                      maxLength={3}
                    />
                    <TouchableOpacity
                      onPress={handleApplyCustomMinutes}
                      style={[styles.applyCustomBtn, { backgroundColor: colors.primary }]}
                    >
                      <Text style={styles.applyCustomBtnText}>SET</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Ambient Soundscapes Selector */}
            <View style={styles.soundscapesSection}>
              <View style={styles.soundscapesHeader}>
                <View style={styles.soundscapesHeaderLeft}>
                  <Ionicons name="musical-notes-outline" size={14} color={colors.primary} />
                  <Text style={styles.presetLabel}>AMBIENT SOUNDSCAPES</Text>
                </View>
                {soundscape !== 'off' && soundscape !== 'none' && (
                  <View style={styles.soundscapeActiveBadge}>
                    <Ionicons name="volume-medium-outline" size={12} color={colors.emerald} />
                    <Text style={[styles.soundscapeActiveBadgeText, { color: colors.emerald }]}>
                      {Math.round(soundVolume * 100)}% VOL
                    </Text>
                  </View>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.soundscapesScrollRow}
              >
                {SOUNDSCAPE_PRESETS.map((preset) => {
                  const isSelected = soundscape === preset.id;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      onPress={() => {
                        HapticsEngine.tier1.selection();
                        setSoundscape(preset.id);
                      }}
                      style={[
                        styles.soundscapeCard,
                        isSelected && {
                          backgroundColor: `${preset.color}22`,
                          borderColor: preset.color,
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={preset.icon as any}
                        size={15}
                        color={isSelected ? preset.color : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.soundscapeCardTitle,
                          isSelected && { color: preset.color, fontWeight: '900' },
                        ]}
                      >
                        {preset.title} {preset.emoji ? preset.emoji : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {soundscape !== 'off' && soundscape !== 'none' && (
                <View style={styles.volumeControlRow}>
                  <TouchableOpacity
                    onPress={() => {
                      HapticsEngine.tier1.light();
                      setSoundVolume((prev) => Math.max(0.2, Number((prev - 0.2).toFixed(1))));
                    }}
                    style={styles.volumeStepBtn}
                  >
                    <Ionicons name="volume-low-outline" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                  <View style={styles.volumeTrack}>
                    <View
                      style={[
                        styles.volumeTrackFill,
                        {
                          width: `${Math.round(soundVolume * 100)}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      HapticsEngine.tier1.light();
                      setSoundVolume((prev) => Math.min(1.0, Number((prev + 0.2).toFixed(1))));
                    }}
                    style={styles.volumeStepBtn}
                  >
                    <Ionicons name="volume-high-outline" size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Quick Socratic Assist Banner */}
            <TouchableOpacity
              onPress={() => {
                HapticsEngine.tier1.light();
                setActiveTab('chat');
              }}
              style={styles.socraticTeaserCard}
              activeOpacity={0.8}
            >
              <View style={[styles.teaserIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.teaserTitle}>Stuck or need an intuition check?</Text>
                <Text style={styles.teaserSubtitle}>
                  Ask your Socratic Mentor (Feynman / Socrates) for real-time guidance.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Tab 2: Socratic Chat */}
        {activeTab === 'chat' && (
          <View style={{ flex: 1 }}>
            <SocraticChatModal
              visible={true}
              onClose={() => setActiveTab('timer')}
              taskId={taskId}
              taskTitle={taskTitle}
              subject={subject}
              initialPersona={persona}
            />
          </View>
        )}

        {/* Tab 3: Socratic Hints */}
        {activeTab === 'hints' && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.hintsScroll}
            style={{ flex: 1 }}
          >
            <GlassCard style={styles.hintDisplayCard}>
              <View style={styles.hintCardHeader}>
                <View style={[styles.hintAvatar, { backgroundColor: `${colors.primary}25` }]}>
                  <Text style={[styles.hintAvatarText, { color: colors.primary }]}>
                    {persona === 'feynman' ? 'RF' : persona === 'socrates' ? 'SOC' : 'MA'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hintAuthorTitle}>
                    {persona === 'feynman'
                      ? 'RICHARD FEYNMAN'
                      : persona === 'socrates'
                      ? 'SOCRATES'
                      : 'MARCUS AURELIUS'}
                  </Text>
                  <Text style={styles.hintAuthorSub}>Socratic Conceptual Guide</Text>
                </View>
                <TouchableOpacity
                  onPress={handleFetchHint}
                  disabled={hintLoading}
                  style={styles.refreshHintBtn}
                >
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {hintLoading ? (
                <View style={styles.hintLoadingBox}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.hintLoadingText, { color: colors.primary }]}>
                    FORMULATING SOCRATIC INTUITION...
                  </Text>
                </View>
              ) : (
                <Text style={styles.hintBodyText}>
                  "{hint || 'Tap below to generate a Socratic intuition hint for this topic.'}"
                </Text>
              )}
            </GlassCard>

            <TouchableOpacity
              onPress={handleFetchHint}
              disabled={hintLoading}
              style={[styles.generateHintCTA, { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}
            >
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={[styles.generateHintCTAText, { color: colors.primary }]}>
                {hint ? 'GENERATE ANOTHER HINT' : 'GET SOCRATIC HINT'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Tab 4: Subtasks Checklist */}
        {activeTab === 'subtasks' && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.subtasksScroll}
            style={{ flex: 1 }}
          >
            <View style={styles.subtasksHeaderRow}>
              <Text style={styles.subtasksSectionTitle}>
                TASK STEPS ({completedSubtasksCount}/{subtasks.length})
              </Text>
              <TouchableOpacity
                onPress={() => setIsAddingSubtask(true)}
                style={styles.addSubtaskBtn}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={[styles.addSubtaskBtnText, { color: colors.primary }]}>ADD STEP</Text>
              </TouchableOpacity>
            </View>

            {isAddingSubtask && (
              <View style={styles.inlineAddRow}>
                <TextInput
                  style={styles.inlineAddInput}
                  placeholder="New subtask..."
                  placeholderTextColor={colors.placeholder}
                  value={newSubtaskTitle}
                  onChangeText={setNewSubtaskTitle}
                  autoFocus
                  onSubmitEditing={handleAddSubtask}
                />
                <TouchableOpacity
                  onPress={handleAddSubtask}
                  style={[styles.inlineAddSubmit, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.inlineAddSubmitText}>ADD</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setIsAddingSubtask(false);
                    setNewSubtaskTitle('');
                  }}
                  style={styles.inlineAddCancel}
                >
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            {subtasks.length === 0 && !isAddingSubtask ? (
              <GlassCard style={styles.emptySubtasksCard}>
                <Text style={styles.emptySubtasksText}>
                  No subtasks defined. Add focused milestone steps to check off during study.
                </Text>
              </GlassCard>
            ) : (
              subtasks.map((st) => (
                <GlassCard key={st.id} style={styles.subtaskItemCard}>
                  <TouchableOpacity
                    onPress={() => handleToggleSubtask(st.id)}
                    style={[styles.subtaskCheck, st.completed && { backgroundColor: colors.emerald, borderColor: colors.emerald }]}
                  >
                    {st.completed && <Ionicons name="checkmark" size={14} color="#050508" />}
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.subtaskItemText,
                      st.completed && styles.subtaskItemTextDone,
                    ]}
                  >
                    {st.title}
                  </Text>
                </GlassCard>
              ))
            )}

            {/* Live Study Notes */}
            <View style={{ marginTop: 24 }}>
              <View style={styles.notesHeaderRow}>
                <Text style={styles.subtasksSectionTitle}>STUDY TAKEAWAYS</Text>
                <Text style={styles.notesSaveBadge}>
                  {saveStatus === 'saving' ? 'SAVING...' : saveStatus === 'saved' ? 'SAVED ✓' : 'AUTOSAVE ON'}
                </Text>
              </View>
              <GlassCard style={styles.notesCard}>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Record insights, formulas, and questions while focused..."
                  placeholderTextColor={colors.placeholder}
                  value={notes}
                  onChangeText={handleNotesChange}
                  multiline
                  numberOfLines={4}
                />
              </GlassCard>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050508',
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.06,
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.05,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  focusLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  focusLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  taskTitleHeader: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  prioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  prioDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  prioText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  durationPill: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  tabSwitcher: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A92A6',
    letterSpacing: 0.5,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  timerCircleWrapper: {
    position: 'relative',
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
  },
  breathingHalo: {
    position: 'absolute',
  },
  svgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  timeTextOverlay: {
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginVertical: 12,
  },
  playPauseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
  },
  playPauseBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#050508',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  addFiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  addFiveBtnText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  resetBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetsSection: {
    width: '100%',
    marginTop: 12,
  },
  presetLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6B7280',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  presetPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  customInput: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  applyCustomBtn: {
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyCustomBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#050508',
  },
  socraticTeaserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 20,
  },
  teaserIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teaserTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  teaserSubtitle: {
    fontSize: 10,
    color: '#8A92A6',
    marginTop: 2,
    lineHeight: 14,
  },
  hintsScroll: {
    padding: 20,
  },
  hintDisplayCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  hintCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  hintAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintAvatarText: {
    fontSize: 11,
    fontWeight: '900',
  },
  hintAuthorTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  hintAuthorSub: {
    fontSize: 10,
    color: '#8A92A6',
  },
  refreshHintBtn: {
    padding: 6,
  },
  hintLoadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  hintLoadingText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  hintBodyText: {
    fontSize: 13,
    color: '#E1E4EA',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  generateHintCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 14,
  },
  generateHintCTAText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtasksScroll: {
    padding: 20,
  },
  subtasksHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subtasksSectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#8A92A6',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  addSubtaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addSubtaskBtnText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  inlineAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  inlineAddInput: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  inlineAddSubmit: {
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineAddSubmitText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#050508',
  },
  inlineAddCancel: {
    padding: 6,
  },
  emptySubtasksCard: {
    padding: 16,
    borderRadius: 14,
  },
  emptySubtasksText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  subtaskItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
  },
  subtaskCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskItemText: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
  },
  subtaskItemTextDone: {
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  notesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notesSaveBadge: {
    fontSize: 9,
    fontWeight: '900',
    color: '#8A92A6',
    letterSpacing: 1,
  },
  notesCard: {
    padding: 14,
    borderRadius: 16,
  },
  notesInput: {
    minHeight: 80,
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 18,
    textAlignVertical: 'top',
  },
  soundscapesSection: {
    width: '100%',
    marginBottom: 20,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  soundscapesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  soundscapesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  soundscapeActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  soundscapeActiveBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  soundscapesScrollRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  soundscapeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  soundscapeCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A92A6',
  },
  volumeControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  volumeStepBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  volumeTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  volumeTrackFill: {
    height: '100%',
    borderRadius: 2,
  },
});
