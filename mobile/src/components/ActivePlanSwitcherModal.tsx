import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { C, Shadows } from '../constants/theme';
import { GlassCard, GlowBadge } from './ui';
import { LearningGoal } from './ActivePlanCard';
import { useLanguage } from '../context/LanguageContext';

interface ActivePlanSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
  goals: LearningGoal[];
  activeGoalId: string | null;
  onSelectGoal: (goalId: string) => void;
  onCreateNewPlan: () => void;
}

export const ActivePlanSwitcherModal: React.FC<ActivePlanSwitcherModalProps> = ({
  visible,
  onClose,
  goals,
  activeGoalId,
  onSelectGoal,
  onCreateNewPlan,
}) => {
  const { t } = useLanguage();

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
              <GlassCard elevated style={styles.sheetCard}>
                {/* Drag Handle Indicator */}
                <View style={styles.dragIndicator} />

                {/* Modal Header */}
                <View style={styles.header}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.headerSub}>{t('plan_switcher.sub')}</Text>
                    <Text style={styles.headerTitle}>{t('plan_switcher.title')}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onClose();
                    }}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Goals List */}
                <ScrollView
                  style={styles.goalsScroll}
                  contentContainerStyle={styles.goalsContainer}
                  showsVerticalScrollIndicator={false}
                >
                  {goals.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="book-outline" size={32} color={C.textMuted} />
                      <Text style={styles.emptyText}>{t('plan_switcher.empty_title')}</Text>
                      <Text style={styles.emptySubText}>
                        {t('plan_switcher.empty_desc')}
                      </Text>
                    </View>
                  ) : (
                    goals.map((goal) => {
                      const isActive = goal.id === activeGoalId;
                      const taskCount = goal.tasks?.length ?? 0;
                      return (
                        <TouchableOpacity
                          key={goal.id}
                          activeOpacity={0.7}
                          onPress={() => {
                            Haptics.selectionAsync();
                            onSelectGoal(goal.id);
                            onClose();
                          }}
                          style={[
                            styles.goalItem,
                            isActive && styles.goalItemActive,
                          ]}
                        >
                          <View style={styles.goalItemContent}>
                            <View style={styles.goalTitleRow}>
                              <Text
                                style={[
                                  styles.goalItemTitle,
                                  isActive && { color: C.electricBlue },
                                ]}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.8}
                              >
                                {goal.title}
                              </Text>
                              {isActive && (
                                <View style={styles.activeCheckBadge}>
                                  <Ionicons name="checkmark" size={12} color="#050508" />
                                </View>
                              )}
                            </View>

                            <View style={styles.goalMetaRow}>
                              <GlowBadge
                                label={t('marketplace.days_study', { count: goal.duration_days })}
                                colorScheme={isActive ? 'blue' : 'slate'}
                              />
                              {taskCount > 0 && (
                                <Text style={styles.taskCountText}>
                                  {t('plan_switcher.modules', { count: taskCount })}
                                </Text>
                              )}
                              {isActive && (
                                <Text style={styles.currentActiveLabel}>
                                  {t('plan_switcher.active_track')}
                                </Text>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>

                {/* Footer Action: Create New Plan */}
                <View style={styles.footer}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onClose();
                      onCreateNewPlan();
                    }}
                    style={styles.createBtn}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={C.electricBlue} />
                    <Text
                      style={styles.createBtnText}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {t('plan_switcher.create_new')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.8)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '75%',
    minHeight: '45%',
    width: '100%',
  },
  sheetCard: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: C.glassBorderSubtle,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerSub: {
    fontSize: 9,
    fontWeight: '800',
    color: C.electricBlue,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalsScroll: {
    flex: 1,
  },
  goalsContainer: {
    paddingBottom: 16,
    gap: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  emptySubText: {
    fontSize: 11,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 240,
  },
  goalItem: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  goalItemActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  goalItemContent: {
    gap: 8,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
    marginRight: 8,
  },
  activeCheckBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.electricBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskCountText: {
    fontSize: 9,
    fontWeight: '800',
    color: C.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  currentActiveLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: C.electricBlue,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginLeft: 'auto',
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 240, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
  },
  createBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: C.electricBlue,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
