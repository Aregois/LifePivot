import React, { useState, useEffect, useRef } from 'react';
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
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { apiRequest } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { GlassCard, GlowBadge } from './ui';

export type SocraticPersona = 'feynman' | 'socrates' | 'stoic';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface SocraticChatModalProps {
  visible: boolean;
  onClose: () => void;
  taskId?: string;
  taskTitle?: string;
  subject?: string;
  initialPersona?: SocraticPersona;
}

const PERSONA_CONFIG: Record<
  SocraticPersona,
  { label: string; title: string; subtitle: string; icon: string; avatar: string }
> = {
  feynman: {
    label: 'Feynman',
    title: 'RICHARD FEYNMAN',
    subtitle: 'Analogy & Intuition Guide',
    icon: 'planet-outline',
    avatar: 'RF',
  },
  socrates: {
    label: 'Socrates',
    title: 'SOCRATES OF ATHENS',
    subtitle: 'Dialectic Questioning Guide',
    icon: 'school-outline',
    avatar: 'SOC',
  },
  stoic: {
    label: 'Marcus Aurelius',
    title: 'MARCUS AURELIUS',
    subtitle: 'Stoic Discipline & Will',
    icon: 'shield-outline',
    avatar: 'MA',
  },
};

const SUGGESTED_CHIPS = [
  '💡 Explain with a simple analogy',
  '❓ Ask me a question to test me',
  '🧩 Break down the hardest concept',
  '🧗 How do I get unstuck on this?',
];

export const SocraticChatModal: React.FC<SocraticChatModalProps> = ({
  visible,
  onClose,
  taskId,
  taskTitle = 'Active Study Topic',
  subject,
  initialPersona = 'feynman',
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [persona, setPersona] = useState<SocraticPersona>(initialPersona);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  // Initialize initial greeting when opened
  useEffect(() => {
    if (visible) {
      setPersona(initialPersona);
      const personaInfo = PERSONA_CONFIG[initialPersona];
      const initialGreeting =
        initialPersona === 'feynman'
          ? `Hello! I'm here to help you build true, intuitive understanding of "${taskTitle}". If you can't explain it to a six-year-old, you don't understand it yet! What's currently confusing you or where should we start?`
          : initialPersona === 'socrates'
          ? `Welcome, seeker. In studying "${taskTitle}", what is the core premise you believe to be true, and how might we examine its foundation together?`
          : `Stand firm. The mind must govern attention. For "${taskTitle}", what is the primary obstacle before you, and what is within your control right now?`;

      setMessages([
        {
          id: 'msg-init',
          role: 'model',
          text: initialGreeting,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setInputText('');
      setErrorMsg(null);
    }
  }, [visible, taskId, taskTitle, initialPersona]);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [messages, isSending]);

  const handleSelectPersona = (newP: SocraticPersona) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPersona(newP);
    const pInfo = PERSONA_CONFIG[newP];
    setMessages((prev) => [
      ...prev,
      {
        id: `switch-${Date.now()}`,
        role: 'model',
        text: `[Persona switched to ${pInfo.title}] How can I guide you on "${taskTitle}" now?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleSend = async (textToSend?: string) => {
    const raw = textToSend || inputText;
    const text = raw.trim();
    if (!text || isSending) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setIsSending(true);
    setErrorMsg(null);

    try {
      // Format chat history for backend
      const formattedHistory = newHistory.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      // Call Next.js tutor API with task grounding
      const response = await apiRequest('/api/tutor/chat', {
        method: 'POST',
        body: JSON.stringify({
          taskId: taskId || 'general',
          message: text,
          history: formattedHistory,
          persona,
        }),
      });

      if (response && response.reply) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setMessages((prev) => [
          ...prev,
          {
            id: `model-${Date.now()}`,
            role: 'model',
            text: response.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        throw new Error(response.error || 'No response from Socratic Tutor');
      }
    } catch (err: any) {
      console.warn('Socratic Chat error:', err);
      // Fallback intelligent offline reasoning
      const fallbackReply =
        persona === 'feynman'
          ? `Think of "${taskTitle}" like a physical machine: what is the input, what transformation happens in the middle, and what comes out? Try explaining that middle step in plain words.`
          : persona === 'socrates'
          ? `Let us examine: why is this step necessary in your study of "${taskTitle}"? What would fail if we skipped it?`
          : `Do not let complexity disturb your focus. Break "${taskTitle}" into one single action for the next 5 minutes. What is that single step?`;

      setMessages((prev) => [
        ...prev,
        {
          id: `fallback-${Date.now()}`,
          role: 'model',
          text: fallbackReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const currentPersonaInfo = PERSONA_CONFIG[persona];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { borderColor: colors.glassBorder }]}>
                {/* Drag Handle */}
                <View style={styles.dragHandle} />

                {/* Top Header */}
                <View style={styles.header}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.headerTitleRow}>
                      <Ionicons name="sparkles" size={14} color={colors.primary} />
                      <Text style={[styles.headerSubtitle, { color: colors.primary }]}>
                        SOCRATIC AI TUTOR
                      </Text>
                    </View>
                    <Text style={styles.taskTitleText} numberOfLines={1}>
                      {taskTitle}
                    </Text>
                  </View>

                  {subject && <GlowBadge label={subject} colorScheme="violet" />}

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onClose();
                    }}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Persona Switcher Strip */}
                <View style={styles.personaStrip}>
                  {(Object.keys(PERSONA_CONFIG) as SocraticPersona[]).map((pKey) => {
                    const isSelected = persona === pKey;
                    const pInfo = PERSONA_CONFIG[pKey];
                    return (
                      <TouchableOpacity
                        key={pKey}
                        onPress={() => handleSelectPersona(pKey)}
                        activeOpacity={0.8}
                        style={[
                          styles.personaBtn,
                          isSelected && {
                            backgroundColor: `${colors.primary}20`,
                            borderColor: colors.primary,
                          },
                        ]}
                      >
                        <Ionicons
                          name={pInfo.icon as any}
                          size={13}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.personaBtnText,
                            isSelected && { color: colors.primary, fontWeight: '900' },
                          ]}
                        >
                          {pInfo.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Persona Tagline Banner */}
                <View style={styles.mentorBanner}>
                  <View
                    style={[
                      styles.mentorAvatar,
                      { backgroundColor: `${colors.primary}25`, borderColor: `${colors.primary}50` },
                    ]}
                  >
                    <Text style={[styles.mentorAvatarText, { color: colors.primary }]}>
                      {currentPersonaInfo.avatar}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mentorBannerTitle}>{currentPersonaInfo.title}</Text>
                    <Text style={styles.mentorBannerSub}>{currentPersonaInfo.subtitle}</Text>
                  </View>
                </View>

                {/* Chat Scroll List */}
                <ScrollView
                  ref={scrollRef}
                  style={styles.chatScroll}
                  contentContainerStyle={styles.chatContent}
                  showsVerticalScrollIndicator={false}
                >
                  {messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <View
                        key={msg.id}
                        style={[
                          styles.msgWrapper,
                          isUser ? styles.msgWrapperUser : styles.msgWrapperModel,
                        ]}
                      >
                        {!isUser && (
                          <View
                            style={[
                              styles.bubbleAvatar,
                              { backgroundColor: `${colors.primary}25` },
                            ]}
                          >
                            <Text style={[styles.bubbleAvatarText, { color: colors.primary }]}>
                              {currentPersonaInfo.avatar}
                            </Text>
                          </View>
                        )}

                        <View
                          style={[
                            styles.bubble,
                            isUser
                              ? [styles.bubbleUser, { backgroundColor: colors.primary }]
                              : styles.bubbleModel,
                          ]}
                        >
                          <Text
                            style={[
                              styles.bubbleText,
                              isUser ? styles.bubbleTextUser : styles.bubbleTextModel,
                            ]}
                          >
                            {msg.text}
                          </Text>
                          <Text
                            style={[
                              styles.bubbleTime,
                              isUser ? styles.bubbleTimeUser : styles.bubbleTimeModel,
                            ]}
                          >
                            {msg.timestamp}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                  {isSending && (
                    <View style={[styles.msgWrapper, styles.msgWrapperModel]}>
                      <View
                        style={[
                          styles.bubbleAvatar,
                          { backgroundColor: `${colors.primary}25` },
                        ]}
                      >
                        <Text style={[styles.bubbleAvatarText, { color: colors.primary }]}>
                          {currentPersonaInfo.avatar}
                        </Text>
                      </View>
                      <View style={[styles.bubble, styles.bubbleModel, styles.typingBubble]}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={[styles.typingText, { color: colors.primary }]}>
                          {currentPersonaInfo.label} is formulating guidance...
                        </Text>
                      </View>
                    </View>
                  )}
                </ScrollView>

                {/* Suggested Prompt Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsScroll}
                  style={styles.chipsContainer}
                >
                  {SUGGESTED_CHIPS.map((chip, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleSend(chip)}
                      disabled={isSending}
                      activeOpacity={0.7}
                      style={styles.chipBtn}
                    >
                      <Text style={styles.chipText}>{chip}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Message Input Footer */}
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.textInput}
                    placeholder={`Ask ${currentPersonaInfo.label} about this task...`}
                    placeholderTextColor={colors.placeholder}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={500}
                    editable={!isSending}
                  />

                  <TouchableOpacity
                    onPress={() => handleSend()}
                    disabled={!inputText.trim() || isSending}
                    activeOpacity={0.8}
                    style={[
                      styles.sendBtn,
                      {
                        backgroundColor: inputText.trim() && !isSending ? colors.primary : '#212534',
                      },
                    ]}
                  >
                    {isSending ? (
                      <ActivityIndicator size="small" color="#050508" />
                    ) : (
                      <Ionicons
                        name="arrow-up"
                        size={18}
                        color={inputText.trim() ? '#050508' : colors.textMuted}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.85)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
    height: '90%',
  },
  modalCard: {
    flex: 1,
    backgroundColor: '#0A0D18',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  taskTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  personaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  personaBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A92A6',
    letterSpacing: 0.5,
  },
  mentorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 8,
  },
  mentorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  mentorAvatarText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  mentorBannerTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  mentorBannerSub: {
    fontSize: 10,
    color: '#8A92A6',
    marginTop: 1,
  },
  chatScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatContent: {
    paddingVertical: 12,
    gap: 12,
  },
  msgWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  msgWrapperUser: {
    justifyContent: 'flex-end',
  },
  msgWrapperModel: {
    justifyContent: 'flex-start',
  },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bubbleAvatarText: {
    fontSize: 10,
    fontWeight: '900',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleModel: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 19,
  },
  bubbleTextUser: {
    color: '#050508',
    fontWeight: '700',
  },
  bubbleTextModel: {
    color: '#E1E4EA',
    fontWeight: '500',
  },
  bubbleTime: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeUser: {
    color: 'rgba(5, 5, 8, 0.6)',
  },
  bubbleTimeModel: {
    color: '#6B7280',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chipsContainer: {
    maxHeight: 38,
    marginVertical: 6,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipText: {
    fontSize: 11,
    color: '#C5CCD8',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
