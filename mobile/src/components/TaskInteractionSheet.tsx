import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, Shadows, BorderRadius } from '../constants/theme';
import { GlassCard, GlowBadge } from './ui';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface Task {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  subject?: string;
  duration_mins?: number;
  due_date: string;
  priority: number;
  task_type: 'task' | 'void';
  status: 'pending' | 'completed';
  pivoted_count: number;
  subtasks: Subtask[];
  notes?: string;
  resources?: any[];
  reflection?: string;
  created_at?: string;
}

interface TaskInteractionSheetProps {
  task: Task | null;
  visible: boolean;
  onClose: () => void;
}

export function TaskInteractionSheet({ task, visible, onClose }: TaskInteractionSheetProps) {
  if (!task) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              <GlassCard style={styles.sheetCard} elevated>
                {/* Drag Indicator */}
                <View style={styles.dragIndicator} />

                {/* Header */}
                <View style={styles.header}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.headerSub}>TASK OVERVIEW</Text>
                    <Text style={styles.headerTitle} numberOfLines={2}>
                      {task.title}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                      {task.subject && <GlowBadge label={task.subject} colorScheme="violet" />}
                      <GlowBadge label={`PRIORITY ${task.priority}`} colorScheme="blue" />
                      {task.duration_mins && (
                        <GlowBadge label={`${task.duration_mins} MINS`} colorScheme="emerald" />
                      )}
                    </View>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Static Content Dashboard */}
                <ScrollView
                  style={styles.contentScroll}
                  contentContainerStyle={styles.contentContainer}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Task Metadata & Details Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SPECIFICATIONS</Text>
                    <GlassCard style={styles.infoCard}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>STATUS</Text>
                        <GlowBadge 
                          label={task.status.toUpperCase()} 
                          colorScheme={task.status === 'completed' ? 'emerald' : 'blue'} 
                        />
                      </View>
                      <View style={styles.infoRowBorder}>
                        <Text style={styles.infoLabel}>DUE DATE</Text>
                        <Text style={styles.infoValue}>
                          {task.due_date ? task.due_date : 'UNDATED'}
                        </Text>
                      </View>
                      <View style={styles.infoRowBorder}>
                        <Text style={styles.infoLabel}>PIVOT COUNT</Text>
                        <Text style={styles.infoValue}>
                          {task.pivoted_count ?? 0}
                        </Text>
                      </View>
                    </GlassCard>
                  </View>

                  {/* Notes Section if available */}
                  {task.notes && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>CURRICULUM NOTES</Text>
                      <GlassCard style={styles.notesCard}>
                        <Text style={styles.notesText}>{task.notes}</Text>
                      </GlassCard>
                    </View>
                  )}

                  {/* STUDY DATA VAULT Placeholder */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>STUDY DATA VAULT</Text>
                    <GlassCard style={styles.vaultCard}>
                      <View style={styles.vaultIconContainer}>
                        <Ionicons name="lock-closed-outline" size={24} color={C.electricBlue} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vaultTitle}>ATTACHMENTS SECURED</Text>
                        <Text style={styles.vaultSubtitle}>
                          Vault storage offline. Document maps configuration will load dynamically in future modules.
                        </Text>
                      </View>
                    </GlassCard>
                  </View>
                </ScrollView>

                {/* Footer Action Button */}
                <View style={styles.footer}>
                  <TouchableOpacity onPress={onClose} style={styles.dismissBtn}>
                    <Text style={styles.dismissText}>DISMISS</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    height: '65%',
    width: '100%',
  },
  sheetCard: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 20,
    backgroundColor: '#0E111F',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerSub: {
    fontSize: 9,
    fontWeight: '900',
    color: C.electricBlue,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    gap: 20,
    paddingBottom: 24,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: C.electricBlue,
    letterSpacing: 1.5,
    paddingLeft: 4,
  },
  infoCard: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRowBorder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
    paddingTop: 12,
    marginTop: 12,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.textMuted,
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  notesCard: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  notesText: {
    fontSize: 11,
    color: C.textSecondary,
    lineHeight: 16,
    fontWeight: '500',
  },
  vaultCard: {
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.02)',
    borderColor: 'rgba(0, 240, 255, 0.1)',
  },
  vaultIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
  },
  vaultTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: C.electricBlue,
    letterSpacing: 1,
  },
  vaultSubtitle: {
    fontSize: 9,
    color: C.textMuted,
    marginTop: 2,
    lineHeight: 13,
  },
  footer: {
    marginTop: 12,
  },
  dismissBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
});
