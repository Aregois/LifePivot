import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HapticsEngine } from '../utils/HapticsEngine';
import { supabase } from '../utils/supabase';
import { apiRequest } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { GlassCard, GlowBadge } from './ui';
import { TaskItem, Subtask } from './DailyTasksHub';
import { SocraticChatModal, SocraticPersona } from './SocraticChatModal';

interface TaskInteractionSheetProps {
  task: TaskItem | null;
  visible: boolean;
  onClose: () => void;
  onUpdateTask?: (updated: Partial<TaskItem> & { id: string }) => void;
  onStartFocus?: (task: TaskItem) => void;
}

const PRIORITY_META: Record<
  number,
  { label: string; color: string; xp: number; tokens: number; desc: string }
> = {
  5: { label: 'P5 CRITICAL', color: '#EF4444', xp: 120, tokens: 3, desc: 'Deep Synthesis & High-Stakes Exam' },
  4: { label: 'P4 HIGH', color: '#F97316', xp: 80, tokens: 2, desc: 'Active Application & Problem Solving' },
  3: { label: 'P3 MEDIUM', color: '#F59E0B', xp: 50, tokens: 1, desc: 'Standard Mastery Drill' },
  2: { label: 'P2 LOW', color: '#00F0FF', xp: 30, tokens: 1, desc: 'Foundational Review' },
  1: { label: 'P1 MINIMAL', color: '#10B981', xp: 20, tokens: 1, desc: 'Quick Micro-Task' },
};

export const TaskInteractionSheet: React.FC<TaskInteractionSheetProps> = ({
  task,
  visible,
  onClose,
  onUpdateTask,
  onStartFocus,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  // Notes state & autosave
  const [notes, setNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autosaveTimerRef = useRef<any>(null);

  // Reflection state & autosave
  const [reflection, setReflection] = useState('');
  const [reflectionStatus, setReflectionStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const reflectionTimerRef = useRef<any>(null);

  // AI Hint state
  const [hint, setHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);

  // Chat modal state
  const [chatVisible, setChatVisible] = useState(false);
  const [persona, setPersona] = useState<SocraticPersona>('feynman');

  // Initialize sheet state when task changes
  useEffect(() => {
    if (task) {
      setSubtasks(task.subtasks || []);
      setNotes(task.notes || '');
      setReflection(task.reflection || '');
      setHint(task.ai_hint || null);
      setHintOpen(!!task.ai_hint);
      setSaveStatus('idle');
      setReflectionStatus('idle');
      setIsAddingSubtask(false);
      setNewSubtaskTitle('');
    }
  }, [task]);

  // Load user persona preference
  useEffect(() => {
    const loadPersona = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('persona_preference')
            .eq('id', user.id)
            .single();
          if (profile?.persona_preference) {
            setPersona(profile.persona_preference as SocraticPersona);
          }
        }
      } catch (e) {
        console.log('Error loading persona preference:', e);
      }
    };
    if (visible) {
      loadPersona();
    }
  }, [visible]);

  // Handle subtask toggle
  const handleToggleSubtask = async (subtaskId: string) => {
    if (!task) return;
    HapticsEngine.tier1.tick();
    const updatedSubtasks = subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    setSubtasks(updatedSubtasks);

    if (onUpdateTask) {
      onUpdateTask({ id: task.id, subtasks: updatedSubtasks });
    }

    try {
      await supabase
        .from('tasks')
        .update({ subtasks: updatedSubtasks })
        .eq('id', task.id);
    } catch (err) {
      console.warn('Failed to update subtasks in DB:', err);
    }
  };

  // Handle add subtask
  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !task) return;
    HapticsEngine.tier1.light();

    const newSub: Subtask = {
      id: Date.now().toString(),
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    const updated = [...subtasks, newSub];
    setSubtasks(updated);
    setNewSubtaskTitle('');
    setIsAddingSubtask(false);

    if (onUpdateTask) {
      onUpdateTask({ id: task.id, subtasks: updated });
    }

    try {
      await supabase.from('tasks').update({ subtasks: updated }).eq('id', task.id);
    } catch (err) {
      console.warn('Failed to add subtask to DB:', err);
    }
  };

  // Handle delete subtask
  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!task) return;
    HapticsEngine.tier1.light();
    const updated = subtasks.filter((s) => s.id !== subtaskId);
    setSubtasks(updated);

    if (onUpdateTask) {
      onUpdateTask({ id: task.id, subtasks: updated });
    }

    try {
      await supabase.from('tasks').update({ subtasks: updated }).eq('id', task.id);
    } catch (err) {
      console.warn('Failed to delete subtask from DB:', err);
    }
  };

  // Handle notes autosave (debounced 800ms)
  const handleNotesChange = (text: string) => {
    setNotes(text);
    setSaveStatus('saving');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      if (!task) return;
      try {
        await supabase.from('tasks').update({ notes: text }).eq('id', task.id);
        setSaveStatus('saved');
        if (onUpdateTask) {
          onUpdateTask({ id: task.id, notes: text });
        }
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.warn('Failed to autosave notes:', err);
        setSaveStatus('idle');
      }
    }, 800);
  };

  // Handle reflection autosave (debounced 800ms)
  const handleReflectionChange = (text: string) => {
    setReflection(text);
    setReflectionStatus('saving');

    if (reflectionTimerRef.current) {
      clearTimeout(reflectionTimerRef.current);
    }

    reflectionTimerRef.current = setTimeout(async () => {
      if (!task) return;
      try {
        await supabase.from('tasks').update({ reflection: text }).eq('id', task.id);
        setReflectionStatus('saved');
        if (onUpdateTask) {
          onUpdateTask({ id: task.id, reflection: text });
        }
        setTimeout(() => setReflectionStatus('idle'), 2000);
      } catch (err) {
        console.warn('Failed to autosave reflection:', err);
        setReflectionStatus('idle');
      }
    }, 800);
  };

  // Handle Socratic AI Hint Generation
  const handleGenerateHint = async () => {
    if (!task) return;
    HapticsEngine.tier2.action();
    setHintLoading(true);
    setHintOpen(true);

    try {
      const res = await apiRequest<{ success: boolean; hint: string }>('/api/tasks/hint', {
        method: 'POST',
        body: JSON.stringify({
          taskId: task.id,
          taskTitle: task.title,
          subject: task.subject,
          persona,
        }),
      });

      if (res.success && res.hint) {
        setHint(res.hint);
        if (onUpdateTask) {
          onUpdateTask({ id: task.id, ai_hint: res.hint });
        }
        HapticsEngine.tier3.success();
      } else {
        // Fallback mock generation
        const mockHint = `Break down "${task.title}" using first principles: identify the fundamental concept, explain it in plain language without jargon, and test yourself on one concrete example.`;
        setHint(mockHint);
      }
    } catch (err) {
      console.warn('Failed to get AI hint, using fallback:', err);
      const mockHint = `Break down "${task.title}" using first principles: identify the fundamental concept, explain it in plain language without jargon, and test yourself on one concrete example.`;
      setHint(mockHint);
    } finally {
      setHintLoading(false);
    }
  };

  if (!task) return null;

  const prio = task.priority || 3;
  const prioInfo = PRIORITY_META[prio] || PRIORITY_META[3];
  const completedSubtasksCount = subtasks.filter((s) => s.completed).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlayBg }]}>
        {/* Backdrop dismiss button */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: colors.cardElevated || colors.card,
                borderColor: colors.glassBorderStrong || colors.glassBorder,
              },
            ]}
          >
            {/* Drag Indicator */}
            <View style={styles.dragIndicator} />

            {/* Header Section */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerSub, { color: colors.primary }]}>TASK SPECIFICATION</Text>
                <Text style={styles.headerTitle} numberOfLines={2}>
                  {task.title}
                </Text>
                <View style={styles.badgeRow}>
                  {task.subject && (
                    <GlowBadge label={task.subject} colorScheme="violet" />
                  )}
                  <View
                    style={[
                      styles.priorityPill,
                      { borderColor: prioInfo.color },
                    ]}
                  >
                    <View
                      style={[
                        styles.prioDot,
                        { backgroundColor: prioInfo.color },
                      ]}
                    />
                    <Text
                      style={[styles.priorityPillText, { color: prioInfo.color }]}
                    >
                      {prioInfo.label}
                    </Text>
                  </View>
                  {task.duration_mins && (
                    <GlowBadge
                      label={`⏳ ${task.duration_mins} MINS`}
                      colorScheme="emerald"
                    />
                  )}
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  HapticsEngine.tier1.light();
                  onClose();
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Primary Focus Launch Hero Button */}
            {task.status !== 'completed' && onStartFocus && (
              <TouchableOpacity
                onPress={() => {
                  HapticsEngine.tier2.action();
                  onClose();
                  onStartFocus(task);
                }}
                style={[styles.heroFocusBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Ionicons name="play" size={16} color="#050508" />
                <Text style={styles.heroFocusBtnText}>
                  {t('focus.start_session_btn') || 'START FOCUS SESSION'} ({task.duration_mins || 25} MINS)
                </Text>
              </TouchableOpacity>
            )}

            {/* Scrollable Content */}
            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              bounces={true}
            >
              {/* Socratic Chat Action Banner */}
              <TouchableOpacity
                onPress={() => {
                  HapticsEngine.tier1.selection();
                  setChatVisible(true);
                }}
                style={[
                  styles.chatTriggerCard,
                  {
                    borderColor: `${colors.primary}40`,
                    backgroundColor: `${colors.primary}10`,
                  },
                ]}
                activeOpacity={0.8}
              >
                <View style={[styles.chatIconBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="chatbubbles" size={16} color="#050508" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.chatTriggerTitle, { color: colors.primary }]}>
                    {t('nav.open_tutor') || 'Chat with Socratic AI Tutor'}
                  </Text>
                  <Text style={styles.chatTriggerSub}>
                    {t('profile.tutor_persona') || 'Ask Feynman or Socrates to guide you'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </TouchableOpacity>

              {/* Completion Rewards Banner */}
              <View
                style={[
                  styles.prioBanner,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.glassBorder,
                  },
                ]}
              >
                <View style={styles.prioBannerRow}>
                  <View>
                    <Text style={styles.prioBannerTitle}>{t('profile.claim_reward') || 'COMPLETION REWARDS'}</Text>
                    <Text style={styles.prioBannerDesc}>{prioInfo.desc}</Text>
                  </View>
                  <View style={styles.rewardBadges}>
                    <View style={[styles.xpRewardPill, { backgroundColor: `${colors.primary}20` }]}>
                      <Text style={[styles.xpRewardText, { color: colors.primary }]}>+{prioInfo.xp} XP</Text>
                    </View>
                    <View style={styles.tokenRewardPill}>
                      <Text style={styles.tokenRewardText}>+{prioInfo.tokens} 🪙</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Subtasks Checklist Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkbox-outline" size={14} color={colors.primary} />
                    <Text style={styles.sectionTitle}>
                      {t('focus.checklist_progress') || 'SUBTASKS CHECKLIST'} ({completedSubtasksCount}/{subtasks.length})
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      HapticsEngine.tier1.light();
                      setIsAddingSubtask(true);
                    }}
                    style={styles.addSubtaskTrigger}
                  >
                    <Ionicons name="add" size={14} color={colors.primary} />
                    <Text style={[styles.addSubtaskTriggerText, { color: colors.primary }]}>
                      {t('creator.add_milestone') || 'ADD ITEM'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.subtasksCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.glassBorder,
                    },
                  ]}
                >
                  {subtasks.length === 0 && !isAddingSubtask ? (
                    <Text style={styles.emptySubtasksText}>
                      {t('focus.no_subtasks') || 'No subtasks defined. Break this task into focused steps.'}
                    </Text>
                  ) : (
                    <View style={styles.subtasksList}>
                      {subtasks.map((st) => (
                        <View key={st.id} style={styles.subtaskItemRow}>
                          <TouchableOpacity
                            onPress={() => handleToggleSubtask(st.id)}
                            style={[
                              styles.subtaskCheckbox,
                              st.completed && [styles.subtaskCheckboxDone, { backgroundColor: colors.emerald, borderColor: colors.emerald }],
                            ]}
                          >
                            {st.completed && (
                              <Ionicons name="checkmark" size={12} color="#050508" />
                            )}
                          </TouchableOpacity>
                          <Text
                            style={[
                              styles.subtaskText,
                              st.completed && styles.subtaskTextDone,
                            ]}
                          >
                            {st.title}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleDeleteSubtask(st.id)}
                            style={styles.subtaskDeleteBtn}
                          >
                            <Ionicons name="trash-outline" size={14} color="#6B7280" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {isAddingSubtask && (
                    <View style={styles.newSubtaskInputRow}>
                      <TextInput
                        style={[styles.newSubtaskInput, { color: colors.textPrimary }]}
                        placeholder="Enter subtask step..."
                        placeholderTextColor={colors.placeholder}
                        value={newSubtaskTitle}
                        onChangeText={setNewSubtaskTitle}
                        autoFocus
                        onSubmitEditing={handleAddSubtask}
                      />
                      <TouchableOpacity
                        onPress={handleAddSubtask}
                        style={[styles.saveSubtaskBtn, { backgroundColor: colors.primary }]}
                      >
                        <Text style={styles.saveSubtaskBtnText}>{t('creator.button_next') || 'ADD'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setIsAddingSubtask(false);
                          setNewSubtaskTitle('');
                        }}
                        style={styles.cancelSubtaskBtn}
                      >
                        <Ionicons name="close" size={16} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Socratic AI Hint Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="bulb-outline" size={14} color={colors.amber} />
                    <Text style={styles.sectionTitle}>{t('focus.socratic_reflection_hint') || 'SOCRATIC AI INSIGHT'}</Text>
                  </View>
                  {!hintOpen && (
                    <TouchableOpacity
                      onPress={handleGenerateHint}
                      style={styles.getHintBtn}
                    >
                      <Ionicons name="sparkles" size={12} color={colors.amber} />
                      <Text style={styles.getHintBtnText}>{t('focus.stuck_btn') || 'GET HINT'}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {hintOpen ? (
                  <View
                    style={[
                      styles.hintCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.glassBorder,
                      },
                    ]}
                  >
                    {hintLoading ? (
                      <View style={styles.hintLoadingContainer}>
                        <ActivityIndicator size="small" color={colors.amber} />
                        <Text style={styles.hintLoadingText}>
                          {t('focus.tutor_thinking') || 'CONSULTING SOCRATIC TUTOR...'}
                        </Text>
                      </View>
                    ) : (
                      <View>
                        <View style={styles.hintHeader}>
                          <View style={[styles.feynmanAvatar, { backgroundColor: `${colors.amber}25` }]}>
                            <Text style={[styles.feynmanAvatarText, { color: colors.amber }]}>RF</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.hintAuthor}>
                              FEYNMAN SOCRATIC MENTOR
                            </Text>
                            <Text style={styles.hintSub}>
                              {t('profile.persona_feynman_desc') || 'Conceptual Intuition Guide'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={handleGenerateHint}
                            style={styles.refreshHintBtn}
                          >
                            <Ionicons name="refresh" size={14} color={colors.amber} />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.hintQuoteText}>"{hint}"</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handleGenerateHint}
                    style={[
                      styles.hintTeaserCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.glassBorder,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="bulb" size={20} color={colors.amber} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.hintTeaserTitle}>
                        {t('focus.stuck_btn') || 'Unblock Conceptual Roadblocks'}
                      </Text>
                      <Text style={styles.hintTeaserSubtitle}>
                        {t('profile.persona_feynman_desc') || 'Tap to generate a Feynman-style Socratic intuition hint for this task.'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              {/* Study Notes Section with Debounced Autosave */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                    <Text style={styles.sectionTitle}>{t('focus.notes_tab') || 'STUDY NOTES'}</Text>
                  </View>
                  <View style={styles.saveStatusContainer}>
                    {saveStatus === 'saving' && (
                      <View style={styles.savingRow}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={[styles.saveStatusText, { color: colors.primary }]}>SAVING...</Text>
                      </View>
                    )}
                    {saveStatus === 'saved' && (
                      <View style={styles.savingRow}>
                        <Ionicons name="checkmark-circle" size={12} color={colors.emerald} />
                        <Text style={[styles.saveStatusText, { color: colors.emerald }]}>AUTOSAVED</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View
                  style={[
                    styles.notesContainer,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.glassBorder,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.notesInput, { color: colors.textPrimary }]}
                    placeholder={t('focus.notes_placeholder') || 'Type your study notes, formulas, equations, or takeaways... (Autosaved)'}
                    placeholderTextColor={colors.placeholder}
                    multiline
                    numberOfLines={4}
                    value={notes}
                    onChangeText={handleNotesChange}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* Reflection / Takeaways Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="journal-outline" size={14} color={colors.secondary} />
                    <Text style={styles.sectionTitle}>{t('focus.reflection_tab') || 'REFLECTION & TAKEAWAYS'}</Text>
                  </View>
                  <View style={styles.saveStatusContainer}>
                    {reflectionStatus === 'saving' && (
                      <View style={styles.savingRow}>
                        <ActivityIndicator size="small" color={colors.secondary} />
                        <Text style={[styles.saveStatusText, { color: colors.secondary }]}>SAVING...</Text>
                      </View>
                    )}
                    {reflectionStatus === 'saved' && (
                      <View style={styles.savingRow}>
                        <Ionicons name="checkmark-circle" size={12} color={colors.emerald} />
                        <Text style={[styles.saveStatusText, { color: colors.emerald }]}>AUTOSAVED</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View
                  style={[
                    styles.notesContainer,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.glassBorder,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.notesInput, { color: colors.textPrimary }]}
                    placeholder={t('focus.reflection_placeholder') || 'What was the most challenging part of this topic? What intuition did you gain?'}
                    placeholderTextColor={colors.placeholder}
                    multiline
                    numberOfLines={3}
                    value={reflection}
                    onChangeText={handleReflectionChange}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Socratic Chat Modal */}
      <SocraticChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        taskId={task.id}
        taskTitle={task.title}
        subject={task.subject}
        initialPersona={persona}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
    height: '92%',
  },
  sheetContainer: {
    flex: 1,
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  dragIndicator: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerSub: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
    letterSpacing: 0.3,
    lineHeight: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  prioDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  priorityPillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  heroFocusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  heroFocusBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#050508',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  chatTriggerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  chatIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatTriggerTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  chatTriggerSub: {
    fontSize: 10,
    color: '#8A92A6',
    marginTop: 2,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 60,
  },
  prioBanner: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  prioBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prioBannerTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  prioBannerDesc: {
    fontSize: 10,
    color: '#8A92A6',
    marginTop: 2,
  },
  rewardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  xpRewardPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  xpRewardText: {
    fontSize: 10,
    fontWeight: '900',
  },
  tokenRewardPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  tokenRewardText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#F59E0B',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  addSubtaskTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addSubtaskTriggerText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtasksCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  emptySubtasksText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  subtasksList: {
    gap: 10,
  },
  subtaskItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subtaskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  subtaskCheckboxDone: {
    borderWidth: 0,
  },
  subtaskText: {
    flex: 1,
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  subtaskTextDone: {
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  subtaskDeleteBtn: {
    padding: 4,
  },
  newSubtaskInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  newSubtaskInput: {
    flex: 1,
    fontSize: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  saveSubtaskBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveSubtaskBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#050508',
  },
  cancelSubtaskBtn: {
    padding: 4,
  },
  getHintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  getHintBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  hintCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  hintLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  hintLoadingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 1,
  },
  hintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  feynmanAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feynmanAvatarText: {
    fontSize: 10,
    fontWeight: '900',
  },
  hintAuthor: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  hintSub: {
    fontSize: 9,
    color: '#8A92A6',
  },
  refreshHintBtn: {
    padding: 4,
  },
  hintQuoteText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#D1D5DB',
    fontStyle: 'italic',
  },
  hintTeaserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  hintTeaserTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  hintTeaserSubtitle: {
    fontSize: 10,
    color: '#8A92A6',
    marginTop: 2,
    lineHeight: 14,
  },
  saveStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saveStatusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  notesContainer: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  notesInput: {
    fontSize: 12,
    lineHeight: 18,
    minHeight: 80,
  },
});

export default TaskInteractionSheet;
