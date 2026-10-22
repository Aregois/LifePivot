import React, { useState, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticsEngine } from '../utils/HapticsEngine';
import { supabase } from '../utils/supabase';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { PremiumButton, GlowBadge, GradientText } from './ui';
import { C, Shadows } from '../constants/theme';

export interface PlanData {
  id: string;
  title: string;
  duration_days: number;
  created_at?: string;
  level?: string;
  goal_intent?: string;
}

interface PlanSettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  plan: PlanData | null;
  initialTab?: 'schedule' | 'add_task' | 'details';
  onPlanUpdated?: (updated: Partial<PlanData>) => void;
  onTaskAdded?: (task: any) => void;
  onPlanDeleted?: (planId: string) => void;
}

function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const PlanSettingsSheet: React.FC<PlanSettingsSheetProps> = ({
  visible,
  onClose,
  plan,
  initialTab = 'schedule',
  onPlanUpdated,
  onTaskAdded,
  onPlanDeleted,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'schedule' | 'add_task' | 'details'>(initialTab);

  // Tasks & Dates state
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [shifting, setShifting] = useState(false);

  // Plan Details fields
  const [title, setTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  // Add Task fields
  const [taskTitle, setTaskTitle] = useState('');
  const [priority, setPriority] = useState<number>(3);
  const [durationMins, setDurationMins] = useState<number>(45);
  const [dueDate, setDueDate] = useState<string>(getLocalDateString());
  const [subtaskInput, setSubtaskInput] = useState('');
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [addingTask, setAddingTask] = useState(false);

  useEffect(() => {
    if (visible && plan) {
      setActiveTab(initialTab);
      setTitle(plan.title || '');
      setDueDate(getLocalDateString());
      setTaskTitle('');
      setSubtasks([]);
      setSubtaskInput('');
      fetchTasks();
    }
  }, [visible, initialTab, plan?.id]);

  const fetchTasks = async () => {
    if (!plan?.id) return;
    setLoadingTasks(true);
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', plan.id)
        .order('due_date', { ascending: true });
      if (data) setTasks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTasks(false);
    }
  };

  if (!visible || !plan) return null;

  // ── Handle Task Date Change ──────────────────────────────────────────────
  const handleTaskDateChange = async (taskId: string, newDate: string) => {
    HapticsEngine.tier2.action();
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, due_date: newDate } : t));

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ due_date: newDate })
        .eq('id', taskId);

      if (error) throw error;
      HapticsEngine.tier3.success();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update task date');
      fetchTasks();
    }
  };

  const handleQuickShiftTask = (taskId: string, daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    handleTaskDateChange(taskId, getLocalDateString(d));
  };

  // ── Handle Bulk Schedule Extension / Shift ───────────────────────────────
  const handleShiftAllUpcoming = async (days: number) => {
    HapticsEngine.tier3.celebrate();
    setShifting(true);

    const todayStr = getLocalDateString();
    try {
      const { data: upcomingTasks } = await supabase
        .from('tasks')
        .select('id, due_date')
        .eq('goal_id', plan.id)
        .gte('due_date', todayStr);

      if (!upcomingTasks || upcomingTasks.length === 0) {
        Alert.alert('No Tasks', 'No upcoming tasks found to shift.');
        setShifting(false);
        return;
      }

      for (const t of upcomingTasks) {
        if (!t.due_date) continue;
        const curr = new Date(t.due_date + 'T00:00:00');
        curr.setDate(curr.getDate() + days);
        await supabase
          .from('tasks')
          .update({ due_date: getLocalDateString(curr) })
          .eq('id', t.id);
      }

      HapticsEngine.tier3.success();
      Alert.alert('Schedule Extended', `Shifted ${upcomingTasks.length} upcoming tasks by ${days > 0 ? '+' : ''}${days} days!`);
      fetchTasks();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to shift schedule');
    } finally {
      setShifting(false);
    }
  };

  // ── Handle Delete Single Task ────────────────────────────────────────────
  const handleDeleteTask = async (taskId: string) => {
    HapticsEngine.tier4.warning();
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await supabase.from('tasks').delete().eq('id', taskId);
      HapticsEngine.tier3.success();
    } catch (e) {
      fetchTasks();
    }
  };

  // ── Handle Save Title ────────────────────────────────────────────────────
  const handleSaveTitle = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a plan title.');
      return;
    }

    setSavingTitle(true);
    HapticsEngine.tier2.action();

    try {
      const { error } = await supabase
        .from('learning_goals')
        .update({ title: title.trim() })
        .eq('id', plan.id);

      if (error) throw error;

      HapticsEngine.tier3.success();
      onPlanUpdated?.({ title: title.trim() });
      Alert.alert('Saved', 'Plan title successfully updated!');
    } catch (err: any) {
      HapticsEngine.tier4.error();
      Alert.alert('Error', err.message || 'Failed to update plan title');
    } finally {
      setSavingTitle(false);
    }
  };

  // ── Handle Add Custom Task ───────────────────────────────────────────────
  const handleAddTask = async () => {
    if (!taskTitle.trim()) {
      Alert.alert('Required', 'Please enter a task title.');
      return;
    }

    setAddingTask(true);
    HapticsEngine.tier2.action();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const formattedSubtasks = subtasks.map((st, i) => ({
        id: `sub_${Date.now()}_${i}`,
        title: st,
        completed: false,
      }));

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          goal_id: plan.id,
          user_id: user.id,
          title: taskTitle.trim(),
          priority,
          duration_mins: durationMins,
          due_date: dueDate,
          task_type: priority === 0 ? 'void' : 'task',
          status: 'pending',
          subtasks: formattedSubtasks,
        })
        .select()
        .single();

      if (error) throw error;

      HapticsEngine.tier3.celebrate();
      onTaskAdded?.(data);
      setTaskTitle('');
      setSubtasks([]);
      setSubtaskInput('');
      fetchTasks();
      Alert.alert('Task Created', 'Custom task added to your curriculum schedule!');
    } catch (err: any) {
      HapticsEngine.tier4.error();
      Alert.alert('Error', err.message || 'Failed to add task');
    } finally {
      setAddingTask(false);
    }
  };

  // ── Handle Delete Entire Plan ────────────────────────────────────────────
  const handleDeletePlan = () => {
    Alert.alert(
      'Delete Plan',
      `Are you sure you want to permanently delete "${plan.title}" and its tasks?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            HapticsEngine.tier4.warning();
            try {
              const { error } = await supabase.from('learning_goals').delete().eq('id', plan.id);
              if (error) throw error;
              HapticsEngine.tier3.success();
              onPlanDeleted?.(plan.id);
              onClose();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete plan');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <View style={[styles.sheetContainer, { backgroundColor: '#10131F', paddingBottom: insets.bottom + 16 }]}>
          {/* Header Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Sheet Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.headerSubtitle, { color: colors.primary }]}>SCHEDULE & TASK DATES</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {plan.title}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Segmented Control Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              onPress={() => {
                HapticsEngine.tier1.selection();
                setActiveTab('schedule');
              }}
              style={[styles.tabButton, activeTab === 'schedule' && { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={activeTab === 'schedule' ? '#050508' : '#9CA3AF'}
              />
              <Text style={[styles.tabButtonText, activeTab === 'schedule' && { color: '#050508', fontWeight: '900' }]}>
                DATES ({tasks.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                HapticsEngine.tier1.selection();
                setActiveTab('add_task');
              }}
              style={[styles.tabButton, activeTab === 'add_task' && { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Ionicons
                name="add-circle-outline"
                size={14}
                color={activeTab === 'add_task' ? '#050508' : '#9CA3AF'}
              />
              <Text style={[styles.tabButtonText, activeTab === 'add_task' && { color: '#050508', fontWeight: '900' }]}>
                ADD TASK
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                HapticsEngine.tier1.selection();
                setActiveTab('details');
              }}
              style={[styles.tabButton, activeTab === 'details' && { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Ionicons
                name="options-outline"
                size={14}
                color={activeTab === 'details' ? '#050508' : '#9CA3AF'}
              />
              <Text style={[styles.tabButtonText, activeTab === 'details' && { color: '#050508', fontWeight: '900' }]}>
                DETAILS
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* ── TAB 1: Tasks & Dates Schedule ───────────────────────────── */}
            {activeTab === 'schedule' && (
              <View style={styles.tabPane}>
                {/* Extend Curriculum Tool */}
                <View style={styles.shiftCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Ionicons name="swap-horizontal" size={16} color={C.neonViolet} />
                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF', textTransform: 'uppercase' }}>
                      Extend / Shift Curriculum
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 10 }}>
                    Shift all upcoming tasks forward across your plan:
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { label: '+1 Day', days: 1 },
                      { label: '+3 Days', days: 3 },
                      { label: '+1 Week', days: 7 },
                      { label: '+30 Days (Extend)', days: 30 },
                    ].map(preset => (
                      <TouchableOpacity
                        key={preset.days}
                        disabled={shifting}
                        onPress={() => handleShiftAllUpcoming(preset.days)}
                        style={styles.shiftPresetBtn}
                      >
                        <Text style={styles.shiftPresetText}>{preset.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Tasks List */}
                <Text style={[styles.fieldLabel, { marginTop: 12, marginBottom: 8 }]}>
                  TASKS IN CURRICULUM ({tasks.length})
                </Text>

                {loadingTasks ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
                ) : tasks.length === 0 ? (
                  <Text style={{ color: '#6B7280', fontSize: 12, textAlign: 'center', marginVertical: 20 }}>
                    No tasks in this plan yet.
                  </Text>
                ) : (
                  tasks.map((task) => (
                    <View key={task.id} style={styles.taskItemCard}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <View style={styles.priorityChip}>
                            <Text style={styles.priorityChipText}>P{task.priority ?? 3}</Text>
                          </View>
                          <Text style={[styles.taskItemTitle, task.status === 'completed' && { textDecorationLine: 'line-through', color: '#6B7280' }]} numberOfLines={1}>
                            {task.title}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 10, color: '#9CA3AF' }}>
                          Due: <Text style={{ color: colors.primary, fontWeight: '800' }}>{task.due_date}</Text> · {task.duration_mins || 45}m
                        </Text>
                      </View>

                      {/* Quick Move Buttons */}
                      <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                        <TouchableOpacity
                          onPress={() => handleQuickShiftTask(task.id, 0)}
                          style={styles.quickDateBtn}
                        >
                          <Text style={styles.quickDateText}>Today</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleQuickShiftTask(task.id, 1)}
                          style={styles.quickDateBtn}
                        >
                          <Text style={styles.quickDateText}>+1d</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleQuickShiftTask(task.id, 7)}
                          style={styles.quickDateBtn}
                        >
                          <Text style={styles.quickDateText}>+7d</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteTask(task.id)}
                          style={styles.deleteTaskBtn}
                        >
                          <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ── TAB 2: Add Custom Task ──────────────────────────────────── */}
            {activeTab === 'add_task' && (
              <View style={styles.tabPane}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>TASK TITLE / TOPIC</Text>
                  <TextInput
                    value={taskTitle}
                    onChangeText={setTaskTitle}
                    placeholder="e.g. Implement Transformer Self-Attention"
                    placeholderTextColor="#6B7280"
                    style={styles.textInput}
                  />
                </View>

                {/* Priority Selection */}
                <View style={styles.fieldGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.fieldLabel}>PRIORITY TIER</Text>
                    <Text style={{ fontSize: 10, color: colors.amber, fontWeight: '800' }}>
                      {priority === 5 ? '+3 TOKENS' : priority === 4 ? '+2 TOKENS' : '+1 TOKEN'}
                    </Text>
                  </View>
                  <View style={styles.chipRow}>
                    {[1, 2, 3, 4, 5].map((p) => {
                      const labels = ['Exercise', 'Reading', 'Standard', 'Deep Focus', 'Mastery'];
                      return (
                        <TouchableOpacity
                          key={p}
                          onPress={() => {
                            HapticsEngine.tier1.tick();
                            setPriority(p);
                          }}
                          style={[
                            styles.priorityButton,
                            priority === p && { backgroundColor: colors.primary, borderColor: colors.primary },
                          ]}
                        >
                          <Text style={[styles.priorityNum, priority === p && { color: '#050508' }]}>P{p}</Text>
                          <Text style={[styles.priorityLabel, priority === p && { color: '#050508' }]} numberOfLines={1}>
                            {labels[p - 1]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Duration */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>DURATION (MINUTES)</Text>
                  <View style={styles.chipRow}>
                    {[15, 30, 45, 60, 90].map((mins) => (
                      <TouchableOpacity
                        key={mins}
                        onPress={() => {
                          HapticsEngine.tier1.tick();
                          setDurationMins(mins);
                        }}
                        style={[
                          styles.chip,
                          durationMins === mins && { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
                        ]}
                      >
                        <Text style={[styles.chipText, durationMins === mins && { color: colors.primary, fontWeight: '900' }]}>
                          {mins}m
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Subtask Checklist Input */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>SUBTASK CHECKLIST (OPTIONAL)</Text>
                  <View style={styles.subtaskInputRow}>
                    <TextInput
                      value={subtaskInput}
                      onChangeText={setSubtaskInput}
                      placeholder="Add concrete step..."
                      placeholderTextColor="#6B7280"
                      style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                      onSubmitEditing={() => {
                        if (subtaskInput.trim()) {
                          HapticsEngine.tier1.selection();
                          setSubtasks([...subtasks, subtaskInput.trim()]);
                          setSubtaskInput('');
                        }
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        if (subtaskInput.trim()) {
                          HapticsEngine.tier1.selection();
                          setSubtasks([...subtasks, subtaskInput.trim()]);
                          setSubtaskInput('');
                        }
                      }}
                      style={[styles.addSubtaskBtn, { backgroundColor: colors.primary }]}
                    >
                      <Ionicons name="add" size={18} color="#050508" />
                    </TouchableOpacity>
                  </View>

                  {/* Render Added Subtasks */}
                  {subtasks.length > 0 && (
                    <View style={{ marginTop: 8, gap: 6 }}>
                      {subtasks.map((st, i) => (
                        <View key={i} style={styles.subtaskBadge}>
                          <Text style={styles.subtaskBadgeText}>
                            {i + 1}. {st}
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              HapticsEngine.tier1.tick();
                              setSubtasks(subtasks.filter((_, idx) => idx !== i));
                            }}
                          >
                            <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <PremiumButton
                  title={addingTask ? 'ADDING TASK...' : 'ADD TASK TO CURRICULUM'}
                  onPress={handleAddTask}
                  loading={addingTask}
                  variant="primary"
                  style={{ marginTop: 12 }}
                />
              </View>
            )}

            {/* ── TAB 3: Details & Danger Zone ─────────────────────────────── */}
            {activeTab === 'details' && (
              <View style={styles.tabPane}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>CURRICULUM TOPIC / TITLE</Text>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. Master React Native & iOS Architecture"
                    placeholderTextColor="#6B7280"
                    style={styles.textInput}
                  />
                </View>

                <PremiumButton
                  title={savingTitle ? 'SAVING...' : 'UPDATE PLAN TITLE'}
                  onPress={handleSaveTitle}
                  loading={savingTitle}
                  variant="primary"
                  style={{ marginTop: 12 }}
                />

                {/* Delete Plan */}
                <TouchableOpacity onPress={handleDeletePlan} style={styles.deletePlanBtn} activeOpacity={0.75}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.deletePlanText}>DELETE THIS PLAN</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.85)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '90%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  tabPane: {
    gap: 12,
  },
  fieldGroup: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#9CA3AF',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityNum: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  priorityLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  subtaskInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addSubtaskBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  subtaskBadgeText: {
    fontSize: 12,
    color: '#D1D5DB',
    flex: 1,
    marginRight: 8,
  },
  shiftCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  shiftPresetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  shiftPresetText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00F0FF',
    textTransform: 'uppercase',
  },
  taskItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 8,
  },
  taskItemTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
  },
  priorityChip: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  priorityChipText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#00F0FF',
  },
  quickDateBtn: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickDateText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D1D5DB',
  },
  deleteTaskBtn: {
    padding: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  deletePlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    marginTop: 16,
  },
  deletePlanText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
