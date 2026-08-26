import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { SupportedLocale } from '../context/LanguageContext';

export { SupportedLocale };

export interface LanguageOption {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', flag: '🇦🇲' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
];

interface LocalizationSelectorModalProps {
  visible: boolean;
  currentLocale: SupportedLocale;
  onSelectLocale: (locale: SupportedLocale) => void;
  onClose: () => void;
}

export const LocalizationSelectorModal: React.FC<LocalizationSelectorModalProps> = ({
  visible,
  currentLocale,
  onSelectLocale,
  onClose,
}) => {
  const { colors } = useTheme();

  const handleSelect = (code: SupportedLocale) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectLocale(code);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheetContainer, { borderColor: colors.glassBorder }]}>
          {/* Top handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.primary }]}>LOCALIZATION</Text>
              <Text style={styles.subtitle}>Select your preferred interface language</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Language list */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLocale;
              return (
                <TouchableOpacity
                  key={lang.code}
                  activeOpacity={0.7}
                  onPress={() => handleSelect(lang.code)}
                  style={[
                    styles.langCard,
                    isSelected && {
                      borderColor: colors.primary,
                      backgroundColor: `${colors.primary}15`,
                    },
                  ]}
                >
                  <View style={styles.langLeft}>
                    <Text style={styles.flag}>{lang.flag}</Text>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={[styles.langName, isSelected && { color: colors.primary, fontWeight: '900' }]}>
                        {lang.nativeName}
                      </Text>
                      <Text style={styles.langCodeName}>
                        {lang.name} • {lang.code.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {isSelected ? (
                    <View style={[styles.radioActive, { borderColor: colors.primary, backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={14} color="#050508" />
                    </View>
                  ) : (
                    <View style={styles.radioInactive} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0E111F',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 11,
    color: '#8A92A6',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    gap: 8,
    paddingBottom: 16,
  },
  langCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  langLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 24,
  },
  langName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  langCodeName: {
    fontSize: 11,
    color: '#8A92A6',
    marginTop: 2,
  },
  radioActive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInactive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});
