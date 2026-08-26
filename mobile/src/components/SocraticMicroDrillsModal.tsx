import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HapticsEngine } from '../utils/HapticsEngine';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../utils/supabase';
import { apiRequest } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { C, Gradients } from '../constants/theme';
import { GlassCard, GradientText, PremiumButton, GlowBadge, FloatingXp } from './ui';

export interface DrillQuestion {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface SocraticMicroDrillsModalProps {
  visible: boolean;
  onClose: () => void;
  taskId?: string;
  taskTitle?: string;
  subject?: string;
  completedMinutes?: number;
  onDrillFinished?: (score: number, total: number) => void;
}

const MULTI_LANG_FALLBACKS: Record<string, DrillQuestion[]> = {
  en: [
    {
      question: 'Which of the following describes the core objective of this study session?',
      options: [
        'Applying foundational principles to solve practical problems.',
        'Passively reviewing textbook pages without active engagement.',
        'Memorizing multiple-choice answers for short-term recall.',
        'Skipping conceptual derivations to finish faster.',
      ],
      correctOptionIndex: 0,
      explanation: 'Active problem-solving and conceptual application build durable neural connections.',
    },
    {
      question: 'Why is active recall essential during Socratic verification?',
      options: [
        'It forces retrieval from long-term memory, highlighting gaps in understanding.',
        'It reduces the amount of total study time needed by 90%.',
        'It is only useful for memorizing arbitrary vocabulary definitions.',
        'It prevents the brain from making new synaptic connections.',
      ],
      correctOptionIndex: 0,
      explanation: 'Active recall strengthens synaptic pathways and immediately reveals comprehension blindspots.',
    },
    {
      question: 'What is the most effective next step when encountering cognitive friction?',
      options: [
        'Deconstruct the concept into simple analogies (Feynman Technique).',
        'Abandon the study session and switch to a different goal.',
        'Reread the same paragraph 5 times without taking notes.',
        'Memorize the formula without understanding the underlying mechanism.',
      ],
      correctOptionIndex: 0,
      explanation: 'The Feynman Technique deconstructs complexity into fundamental axioms.',
    },
  ],
  ru: [
    {
      question: 'Что из следующего описывает основную цель этой темы?',
      options: [
        'Применение принципов к практическому решению задач.',
        'Пассивный обзор концепций без активного вовлечения.',
        'Заучивание ответов для подготовки к экзамену.',
        'Игнорирование концептуальных основ.',
      ],
      correctOptionIndex: 0,
      explanation: 'Практическое применение укрепляет долговременные нейронные связи.',
    },
    {
      question: 'Почему активное припоминание важно для этой задачи?',
      options: [
        'Оно выстраивает долгосрочные нейронные связи и выявляет пробелы в понимании.',
        'Оно ускоряет обучение, но делает его менее эффективным.',
        'Оно полезно только для заучивания словарных слов.',
        'Оно не влияет на долгосрочное удержание информации.',
      ],
      correctOptionIndex: 0,
      explanation: 'Активное припоминание заставляет мозг извлекать информацию.',
    },
    {
      question: 'Какой лучший способ проверить концептуальное мастерство?',
      options: [
        'Простое объяснение идеи своими словами (метод Фейнмана).',
        'Многократное перечитывание страницы учебника.',
        'Выделение определений разными цветами.',
        'Переход сразу к продвинутому материалу.',
      ],
      correctOptionIndex: 0,
      explanation: 'Объяснение идеи простыми словами показывает реальный уровень понимания.',
    },
  ],
  fr: [
    {
      question: 'Lequel des éléments suivants décrit l\'objectif principal de cette session ?',
      options: [
        'Appliquer les principes à la résolution de problèmes pratiques.',
        'Revoir passivement les concepts sans engagement.',
        'Mémoriser les réponses pour la préparation aux examens.',
        'Ignorer les bases conceptuelles.',
      ],
      correctOptionIndex: 0,
      explanation: 'La résolution active de problèmes cimente les connexions neuronales.',
    },
    {
      question: 'Pourquoi la récupération active est-elle importante ?',
      options: [
        'Elle renforce les connexions neuronales et révèle les lacunes de compréhension.',
        'Elle rend l\'étude plus rapide mais moins efficace.',
        'Elle n\'est utile que pour les termes de vocabulaire.',
        'Elle n\'affecte pas la rétention à long terme.',
      ],
      correctOptionIndex: 0,
      explanation: 'La récupération active force le cerveau à retrouver les connaissances.',
    },
    {
      question: 'Quel est le meilleur moyen de vérifier la maîtrise conceptuelle ?',
      options: [
        'Expliquer l\'idée simplement avec ses propres mots (technique de Feynman).',
        'Relire la page du manuel plusieurs fois.',
        'Surligner des définitions dans différentes couleurs.',
        'Passer directement au matériel avancé.',
      ],
      correctOptionIndex: 0,
      explanation: 'Expliquer un concept simplement valide la compréhension en profondeur.',
    },
  ],
  es: [
    {
      question: '¿Cuál de las siguientes opciones describe el objetivo principal de esta sesión?',
      options: [
        'Aplicar los principios a la resolución práctica de problemas.',
        'Revisar pasivamente los conceptos sin involucrarse.',
        'Memorizar respuestas para la preparación de exámenes.',
        'Ignorar las bases conceptuales.',
      ],
      correctOptionIndex: 0,
      explanation: 'La resolución práctica afianza el aprendizaje duradero.',
    },
    {
      question: '¿Por qué es importante el recuerdo activo?',
      options: [
        'Construye conexiones neuronales a largo plazo y expone brechas de comprensión.',
        'Hace que el estudio sea más rápido pero menos efectivo.',
        'Solo es útil para términos de vocabulario.',
        'No afecta la retención a largo plazo.',
      ],
      correctOptionIndex: 0,
      explanation: 'El recuerdo activo ejercita la recuperación de memoria profunda.',
    },
    {
      question: '¿Cuál es la mejor manera de verificar el dominio conceptual?',
      options: [
        'Explicar la idea de manera sencilla con tus propias palabras (Técnica Feynman).',
        'Releer la página del libro de texto varias veces.',
        'Resaltar definiciones con diferentes colores.',
        'Pasar directamente al material avanzado.',
      ],
      correctOptionIndex: 0,
      explanation: 'Explicar con palabras propias revela vacíos de comprensión.',
    },
  ],
  hy: [
    {
      question: 'Հետևյալներից ո՞րն է նկարագրում այս թեմայի հիմնական նպատակը:',
      options: [
        'Սկզբունքների կիրառումը գործնական խնդիրների լուծման մեջ:',
        'Հասկացությունների պասիվ վերանայում առանց ներգրավվածության:',
        'Պատասխանների անգիր անելը քննության նախապատրաստման համար:',
        'Հայեցակարգային հիմքերի անտեսումը:',
      ],
      correctOptionIndex: 0,
      explanation: 'Գործնական կիրառումը ամրապնդում է նյարդային կապերը:',
    },
    {
      question: 'Ինչու՞ է ակտիվ վերհիշումը կարևոր այս առաջադրանքի համար:',
      options: [
        'Այն կառուցում է երկարաժամկետ նյարդային կապեր և բացահայտում ըմբռնման բացերը:',
        'Այն ուսումնառությունը դարձնում է ավելի արագ, բայց պակաս արդյունավետ:',
        'Այն օգտակար է միայն բառապաշարի տերմինների համար:',
        'Այն չի ազդում երկարաժամկետ հիշողության վրա:',
      ],
      correctOptionIndex: 0,
      explanation: 'Ակտիվ վերհիշումը ստիպում է ուղեղին արդյունավետ աշխատել:',
    },
    {
      question: 'Ո՞րն է հայեցակարգային տիրապետումը ստուգելու լավագույն միջոցը:',
      options: [
        'Գաղափարը պարզապես սեփական բառերով բացատրելը (Ֆեյնմանի մեթոդ):',
        'Դասագրքի էջը բազմիցս վերընթերցելը:',
        'Սահմանումները տարբեր գույներով ընդգծելը:',
        'Անմիջապես անցնելը բարդ նյութերին:',
      ],
      correctOptionIndex: 0,
      explanation: 'Սեփական բառերով բացատրելը ցույց է տալիս իրական գիտելիքը:',
    },
  ],
  ja: [
    {
      question: '次のうち、このセッションの核心的な目的を説明しているものはどれですか？',
      options: [
        '原則を実践的な問題解決に応用すること。',
        '主体的に関与せず、受動的に概念を見直すこと。',
        '試験対策のために答えを暗記すること。',
        '概念的な基礎を無視すること。',
      ],
      correctOptionIndex: 0,
      explanation: '能動的な問題解決により強固な記憶が定着します。',
    },
    {
      question: 'なぜアクティブリコールが重要なのですか？',
      options: [
        '長期的な神経接続を構築し、理解のギャップを明らかにするため。',
        '学習は早くなるが、効果は低くなるため。',
        '語彙の用語にのみ有用であるため。',
        '長期的な記憶定着には影響しないため。',
      ],
      correctOptionIndex: 0,
      explanation: 'アクティブリコールは記憶の検索経路を強化します。',
    },
    {
      question: '概念の習得度を確認する最良の方法は何ですか？',
      options: [
        '自分の言葉でシンプルにそのアイデアを説明すること（ファインマン・テクニック）。',
        '教科書のページを何度も読み返すこと。',
        '異なる色で定義をハイライトすること。',
        'すぐに高度な内容に進むこと。',
      ],
      correctOptionIndex: 0,
      explanation: '自分の言葉で説明することで理解の抜け漏れを発見できます。',
    },
  ],
  zh: [
    {
      question: '以下哪项描述了本次学习的核心目标？',
      options: [
        '将原理应用到实际解题中。',
        '被动地复习概念而不参与互动。',
        '为了备考而死记硬背答案。',
        '忽略概念基础。',
      ],
      correctOptionIndex: 0,
      explanation: '主动应用核心概念能构建牢固的长期记忆。',
    },
    {
      question: '为什么主动回忆对这项任务很重要？',
      options: [
        '它建立长期神经连接并暴露理解盲区。',
        '它让学习更快但效果更差。',
        '它仅对词汇术语有用。',
        '它不影响长期记忆。',
      ],
      correctOptionIndex: 0,
      explanation: '主动提取强化神经回路连接。',
    },
    {
      question: '验证概念掌握情况的最佳方法是什么？',
      options: [
        '用自己的话简单解释这个概念（费曼学习法）。',
        '多次重读教科书页面。',
        '用不同的颜色突出显示定义。',
        '直接跳到高级材料。',
      ],
      correctOptionIndex: 0,
      explanation: '能够用浅显的语言解释是深度掌握的标志。',
    },
  ],
};

function shuffleQuestionOptions(q: DrillQuestion): DrillQuestion {
  const originalOptions = q.options;
  const correctOptionText = originalOptions[q.correctOptionIndex ?? 0];
  const shuffled = [...originalOptions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const newCorrectIndex = shuffled.indexOf(correctOptionText);
  return {
    ...q,
    options: shuffled,
    correctOptionIndex: newCorrectIndex !== -1 ? newCorrectIndex : 0,
  };
}

export const SocraticMicroDrillsModal: React.FC<SocraticMicroDrillsModalProps> = ({
  visible,
  onClose,
  taskId,
  taskTitle = 'Completed Focus Sprint',
  subject,
  completedMinutes = 25,
  onDrillFinished,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [questions, setQuestions] = useState<DrillQuestion[]>(() =>
    MULTI_LANG_FALLBACKS.en.map(shuffleQuestionOptions)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState(0);
  const [earnedTokens, setEarnedTokens] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [newLevel, setNewLevel] = useState<number | null>(null);
  const [userLang, setUserLang] = useState('en');

  // Load questions when modal becomes visible
  const loadDrillQuestions = useCallback(async () => {
    setLoading(true);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setSubmitted(false);
    setScore(0);
    setEarnedTokens(0);
    setEarnedXp(0);
    setLeveledUp(false);
    setNewLevel(null);

    // Detect user language preference
    let detectedLang = 'en';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('language')
          .eq('id', user.id)
          .single();
        if (profile?.language && MULTI_LANG_FALLBACKS[profile.language]) {
          detectedLang = profile.language;
          setUserLang(profile.language);
        }
      }
    } catch {
      // ignore
    }

    const fallbackQuestions = (
      MULTI_LANG_FALLBACKS[detectedLang] || MULTI_LANG_FALLBACKS.en
    ).map(shuffleQuestionOptions);

    // Try fetching dynamically generated Gemini questions via API
    if (taskId) {
      try {
        const data = await apiRequest<{ drill?: { questions: DrillQuestion[] } }>(
          '/api/tasks/drill/generate',
          {
            method: 'POST',
            body: JSON.stringify({ taskId }),
          }
        );

        if (data?.drill?.questions && Array.isArray(data.drill.questions) && data.drill.questions.length > 0) {
          setQuestions(data.drill.questions);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.log('Drill API generate fallback to localized default:', e);
      }
    }

    setQuestions(fallbackQuestions);
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    if (visible) {
      loadDrillQuestions();
    }
  }, [visible, loadDrillQuestions]);

  const currentQ = questions[currentIndex] || questions[0];
  const isSelected = selectedAnswers[currentIndex] !== undefined;

  const handleSelectOption = (optIndex: number) => {
    if (submitted) return;
    HapticsEngine.tier1.selection();
    setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: optIndex }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      HapticsEngine.tier1.light();
      setCurrentIndex((prev) => prev + 1);
    } else {
      evaluateAndSubmit();
    }
  };

  const evaluateAndSubmit = async () => {
    setSubmitted(true);
    setSaving(true);

    // Calculate score locally
    let calcScore = 0;
    questions.forEach((q, idx) => {
      const selected = selectedAnswers[idx];
      const correct = q.correctOptionIndex !== undefined ? q.correctOptionIndex : 0;
      if (selected === correct) {
        calcScore += 1;
      }
    });
    setScore(calcScore);

    const isPerfect = calcScore === questions.length;
    const baseRewardXp = 50 + calcScore * 20;
    const baseRewardTokens = isPerfect ? 15 : (calcScore > 0 ? 5 : 0);

    if (isPerfect) {
      HapticsEngine.tier3.celebrate();
    } else {
      HapticsEngine.tier2.action();
    }

    // Try server verification API first
    if (taskId) {
      try {
        const answersArray = questions.map((_, idx) => selectedAnswers[idx] ?? 0);
        const res = await apiRequest<{
          success: boolean;
          correctCount?: number;
          rewardXp?: number;
          rewardTokens?: number;
          leveledUp?: boolean;
          newLevel?: number;
        }>('/api/tasks/drill/verify', {
          method: 'POST',
          body: JSON.stringify({
            taskId,
            userAnswers: answersArray,
            isFullFocus: completedMinutes >= 25,
          }),
        });

        if (res.success) {
          setEarnedTokens(res.rewardTokens ?? baseRewardTokens);
          setEarnedXp(res.rewardXp ?? baseRewardXp);
          if (res.leveledUp) {
            setLeveledUp(true);
            setNewLevel(res.newLevel ?? null);
          }
          setSaving(false);
          if (onDrillFinished) {
            onDrillFinished(calcScore, questions.length);
          }
          return;
        }
      } catch (err) {
        console.log('Drill verification API fallback to Supabase client sync:', err);
      }
    }

    // Fallback: Client-side DB sync with Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('xp, tokens_balance, level, multiplier_active')
          .eq('id', user.id)
          .single();

        if (profile) {
          let tokenDelta = baseRewardTokens;
          if (profile.multiplier_active && tokenDelta > 0) {
            tokenDelta = tokenDelta * 2;
          }

          let newXpVal = (profile.xp ?? 0) + baseRewardXp;
          let newLvlVal = profile.level ?? 1;
          let didLvlUp = false;

          let xpNeeded = newLvlVal * 100;
          while (newXpVal >= xpNeeded && newLvlVal < 100) {
            newXpVal -= xpNeeded;
            newLvlVal += 1;
            xpNeeded = newLvlVal * 100;
            didLvlUp = true;
          }

          await supabase
            .from('profiles')
            .update({
              xp: newXpVal,
              tokens_balance: (profile.tokens_balance ?? 0) + tokenDelta,
              level: newLvlVal,
              multiplier_active: profile.multiplier_active ? false : profile.multiplier_active,
            })
            .eq('id', user.id);

          setEarnedTokens(tokenDelta);
          setEarnedXp(baseRewardXp);
          if (didLvlUp) {
            setLeveledUp(true);
            setNewLevel(newLvlVal);
          }
        }

        if (taskId) {
          await supabase
            .from('tasks')
            .update({ status: 'completed' })
            .eq('id', taskId)
            .eq('user_id', user.id);
        }
      }
    } catch (e) {
      console.error('Failed to sync drill rewards:', e);
      setEarnedTokens(baseRewardTokens);
      setEarnedXp(baseRewardXp);
    } finally {
      setSaving(false);
      if (onDrillFinished) {
        onDrillFinished(calcScore, questions.length);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top > 0 ? insets.top : Platform.OS === 'ios' ? 50 : 20,
            paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24,
          },
        ]}
      >
        {/* Background Ambient Glow */}
        <View pointerEvents="none" style={[styles.ambientGlow, { backgroundColor: colors.primary }]} />

        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            style={styles.iconButton}
          >
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>SOCRATIC VERIFICATION</Text>
            <Text numberOfLines={1} style={styles.headerTitle}>
              {taskTitle}
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={C.electricBlue} />
            <Text style={styles.loadingText}>SYNTHESIZING COMPREHENSION DRILLS...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {!submitted ? (
              <>
                {/* Progress Indicators */}
                <View style={styles.progressRow}>
                  <Text style={styles.questionCounter}>
                    QUESTION {currentIndex + 1} OF {questions.length}
                  </Text>
                  <View style={styles.dotsRow}>
                    {questions.map((_, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.dot,
                          idx === currentIndex && styles.dotActive,
                          selectedAnswers[idx] !== undefined && styles.dotCompleted,
                        ]}
                      />
                    ))}
                  </View>
                </View>

                {/* Question Card */}
                <GlassCard elevated style={styles.questionCard}>
                  <Text style={styles.questionText}>{currentQ.question}</Text>

                  <View style={styles.optionsContainer}>
                    {currentQ.options.map((opt, optIdx) => {
                      const selected = selectedAnswers[currentIndex] === optIdx;
                      return (
                        <TouchableOpacity
                          key={optIdx}
                          onPress={() => handleSelectOption(optIdx)}
                          activeOpacity={0.7}
                          style={[
                            styles.optionItem,
                            selected && styles.optionItemSelected,
                          ]}
                        >
                          <View
                            style={[
                              styles.radioCircle,
                              selected && styles.radioCircleSelected,
                            ]}
                          >
                            {selected && <View style={styles.radioInnerCircle} />}
                          </View>
                          <Text
                            style={[
                              styles.optionText,
                              selected && styles.optionTextSelected,
                            ]}
                          >
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </GlassCard>

                {/* Socratic Navigation CTA */}
                <PremiumButton
                  title={
                    currentIndex === questions.length - 1
                      ? 'SUBMIT VERIFICATION'
                      : 'NEXT QUESTION'
                  }
                  onPress={handleNext}
                  disabled={!isSelected}
                  variant={isSelected ? 'primary' : 'ghost'}
                  style={{ marginTop: 24, width: '100%', minHeight: 48 }}
                />
              </>
            ) : (
              /* Results Screen */
              <GlassCard elevated style={styles.resultsCard}>
                <View
                  style={[
                    styles.resultsIconWrapper,
                    score === questions.length && styles.resultsIconPerfect,
                  ]}
                >
                  <Ionicons
                    name={score === questions.length ? 'trophy' : 'ribbon-outline'}
                    size={42}
                    color={score === questions.length ? '#F59E0B' : C.electricBlue}
                  />
                </View>

                <GradientText
                  colors={
                    score === questions.length
                      ? [C.amber, '#FCD34D']
                      : Gradients.primaryButton
                  }
                  style={styles.resultsTitle}
                >
                  {score === questions.length ? 'PERFECT VERIFICATION!' : 'DRILL COMPLETED!'}
                </GradientText>

                <Text style={styles.scoreText}>
                  SCORE: {score} / {questions.length}
                </Text>

                <View style={styles.rewardBadgesContainer}>
                  <GlowBadge
                    label={`+${earnedXp || (50 + score * 20)} XP`}
                    colorScheme="cyan"
                    glow
                  />
                  {(earnedTokens > 0 || score > 0) && (
                    <GlowBadge
                      label={`+${earnedTokens || (score === 3 ? 15 : 5)} TOKENS 🪙`}
                      colorScheme="amber"
                      glow
                    />
                  )}
                </View>

                {leveledUp && (
                  <View style={styles.levelUpNotice}>
                    <Text style={styles.levelUpText}>
                      🌟 LEVEL UP! YOU ARE NOW LEVEL {newLevel} 🌟
                    </Text>
                  </View>
                )}

                <Text style={styles.explanationSummary}>
                  {score === questions.length
                    ? '✦ Flawless conceptual mastery. All neural pathways verified.'
                    : '✦ Focus sprint logged. Review any tricky areas in your next session.'}
                </Text>

                {saving && (
                  <ActivityIndicator
                    size="small"
                    color={C.electricBlue}
                    style={{ marginTop: 16 }}
                  />
                )}

                <PremiumButton
                  title="RETURN TO DASHBOARD"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onClose();
                  }}
                  variant="primary"
                  style={{ marginTop: 24, width: '100%', minHeight: 48 }}
                />
              </GlassCard>
            )}
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
  ambientGlow: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#00F0FF',
    opacity: 0.06,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '900',
    color: C.electricBlue,
    letterSpacing: 2,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 11,
    fontWeight: '900',
    color: C.electricBlue,
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  questionCounter: {
    fontSize: 10,
    fontWeight: '900',
    color: C.electricBlue,
    letterSpacing: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dotActive: {
    backgroundColor: C.electricBlue,
  },
  dotCompleted: {
    backgroundColor: C.emerald,
  },
  questionCard: {
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  questionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  optionItemSelected: {
    borderColor: C.electricBlue,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioCircleSelected: {
    borderColor: C.electricBlue,
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.electricBlue,
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  resultsCard: {
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  resultsIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
    marginBottom: 16,
  },
  resultsIconPerfect: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 16,
  },
  rewardBadgesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  levelUpNotice: {
    backgroundColor: 'rgba(189, 0, 255, 0.15)',
    borderWidth: 1,
    borderColor: C.neonViolet,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
  },
  levelUpText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#E9D5FF',
    letterSpacing: 1,
    textAlign: 'center',
  },
  explanationSummary: {
    fontSize: 11,
    color: C.textDim,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});
