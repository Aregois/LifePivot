import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { C, Gradients } from '../constants/theme';
import { GlassCard, GradientText, PremiumButton, GlowBadge } from './ui';

export interface VoidDayPlacementModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (placement: 'tomorrow' | 'end') => Promise<void> | void;
  loading?: boolean;
}

export const VoidDayPlacementModal: React.FC<VoidDayPlacementModalProps> = ({
  visible,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [placement, setPlacement] = useState<'tomorrow' | 'end'>('tomorrow');

  const handleSelect = (choice: 'tomorrow' | 'end') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPlacement(choice);
  };

  const handleProceed = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm(placement);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <GlassCard elevated style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <Text style={{ fontSize: 24 }}>🌌</Text>
              <View>
                <Text style={styles.subtitle}>IN-APP UTILITY · 10 TOKENS</Text>
                <Text style={styles.title}>SCHEDULE VOID DAY</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            A Void Day pauses your active syllabus for neural recovery and rest, without damaging your study streak.
          </Text>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* Tomorrow Option */}
            <TouchableOpacity
              onPress={() => handleSelect('tomorrow')}
              activeOpacity={0.7}
              style={[
                styles.optionCard,
                placement === 'tomorrow' && styles.optionCardSelected,
              ]}
            >
              <View style={styles.optionHeader}>
                <View style={[styles.radio, placement === 'tomorrow' && styles.radioSelected]}>
                  {placement === 'tomorrow' && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.optionTitle, placement === 'tomorrow' && styles.optionTitleSelected]}>
                  TOMORROW (PIVOT SHIFT)
                </Text>
                <GlowBadge label="RECOMMENDED" colorScheme="cyan" />
              </View>
              <Text style={styles.optionDetails}>
                Inserts a Void Day tomorrow. All upcoming scheduled tasks are safely pushed forward by +1 day.
              </Text>
            </TouchableOpacity>

            {/* End of Plan Option */}
            <TouchableOpacity
              onPress={() => handleSelect('end')}
              activeOpacity={0.7}
              style={[
                styles.optionCard,
                placement === 'end' && styles.optionCardSelected,
              ]}
            >
              <View style={styles.optionHeader}>
                <View style={[styles.radio, placement === 'end' && styles.radioSelected]}>
                  {placement === 'end' && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.optionTitle, placement === 'end' && styles.optionTitleSelected]}>
                  END OF PLAN (BUFFER)
                </Text>
              </View>
              <Text style={styles.optionDetails}>
                Appends an extra rest and review buffer day after your last scheduled syllabus task.
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <PremiumButton
                title={loading ? 'SCHEDULING...' : 'CONFIRM (10 🪙)'}
                onPress={handleProceed}
                disabled={loading}
                variant="primary"
                style={{ minHeight: 46 }}
              />
            </View>
          </View>
        </GlassCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subtitle: {
    fontSize: 9,
    fontWeight: '900',
    color: C.electricBlue,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  description: {
    fontSize: 12,
    color: C.textDim,
    lineHeight: 18,
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  optionCardSelected: {
    borderColor: C.electricBlue,
    backgroundColor: 'rgba(0, 240, 255, 0.06)',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: C.electricBlue,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.electricBlue,
  },
  optionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#9CA3AF',
    flex: 1,
    letterSpacing: 0.5,
  },
  optionTitleSelected: {
    color: '#FFFFFF',
  },
  optionDetails: {
    fontSize: 11,
    color: C.textDim,
    lineHeight: 16,
    paddingLeft: 28,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: C.textDim,
    letterSpacing: 1,
  },
});
