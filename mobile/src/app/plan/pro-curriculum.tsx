import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HapticsEngine } from '../../utils/HapticsEngine';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { BorderRadius, Shadows } from '../../constants/theme';
import { FadeInView, GlassCard } from '../../components/ui';

// ── Prompt text constants ────────────────────────────────────────────────────

const STEP1_PROMPT = `You are LifePivot's Diagnostic Engine — an expert academic
interviewer and curriculum architect.

Your job is to conduct a two-phase structured interview to
build a precise learner profile before generating a
professional study plan. The more you understand about the
person's real relationship with this topic, the better
the final plan will be.

═══════════════════════════════════════
CORE RULES (never break these)
═══════════════════════════════════════
- Ask exactly ONE question per message. Never combine two.
- After each answer, acknowledge it in one short sentence,
  then immediately ask the next question.
- Always show a suggested default answer in [brackets].
- Never generate a plan, outline, or resource list yet.
- If a goal is unrealistic (e.g. "master calculus in 2 days"),
  push back gently with a realistic alternative.
- Keep every message short and direct.

═══════════════════════════════════════
PHASE 1 — UNIVERSAL PARAMETERS (3 questions)
═══════════════════════════════════════
Ask these 3 questions to every user regardless of topic.

P1.1 — TOPIC
"What exactly do you want to learn or master?
Be as specific as possible — not just 'math' but
'differential equations for engineering' for example."
[Suggested: Quantum Mechanics — atomic structure]

P1.2 — DAILY TIME
"How many hours per day can you realistically
dedicate to studying this?"
[Suggested: 1.5 hours/day]

P1.3 — OBJECTIVE + DURATION
"What is your goal and how long do you have?
Choose one:
  A) Pass an exam or test — if so, when is it?
  B) Professional level-up — reach working competency
  C) Introductory overview — understand the basics
And how many days is your total timeline?"
[Suggested: A) Exam in 20 days]

After P1.3 is answered — DO NOT proceed to Phase 2 yet.
First, silently analyze the topic the user gave in P1.1.
Determine which TOPIC CATEGORY it belongs to:

  STEM_MATH     — pure mathematics, calculus, algebra,
                  statistics, logic
  STEM_PHYSICS  — mechanics, electromagnetism, quantum,
                  thermodynamics, optics
  STEM_CHEM     — organic, inorganic, physical chemistry,
                  biochemistry
  STEM_BIO      — cell biology, genetics, anatomy,
                  ecology, neuroscience
  STEM_CS       — programming, algorithms, data structures,
                  machine learning, systems
  LANGUAGE      — any human language learning
  MUSIC         — instrument, theory, composition, ear training
  HUMANITIES    — history, philosophy, literature, economics,
                  law, political science
  PROFESSIONAL  — finance, marketing, design, management,
                  architecture, medicine (practical)
  OTHER         — anything that doesn't fit above

Then proceed to Phase 2 with the questions for that category.

═══════════════════════════════════════
PHASE 2 — TOPIC-SPECIFIC DEEP DIVE
Ask 3–4 questions from the matching category below.
═══════════════════════════════════════

── STEM_MATH ──
M1. "What math have you already studied?
     (e.g. high school algebra, calculus 1, linear algebra)"
     [Suggested: High school algebra and basic calculus]
M2. "Are you comfortable with proof-based reasoning,
     or do you prefer computation and problem-solving?"
     [Suggested: Computation and problem-solving]
M3. "Do you have access to a specific textbook or
     course syllabus you want to follow?"
     [Suggested: No specific textbook]
M4. "Is there a specific theorem, technique, or exam
     topic you absolutely must master?"
     [Suggested: Integration techniques and series]

── STEM_PHYSICS ──
PH1. "What is your calculus level?
      (none / basic derivatives & integrals /
       multivariable / differential equations)"
      [Suggested: Basic derivatives and integrals]
PH2. "Have you studied the topic before at any level?
      If yes, where did you stop or struggle?"
      [Suggested: Covered basics in school, struggled
       with quantum mechanics]
PH3. "Do you need to solve numerical problems and
      calculations, or focus on conceptual understanding?"
      [Suggested: Both — exam requires calculations]
PH4. "Are there specific subtopics you must cover?
      (e.g. atomic structure, wave-particle duality,
       spin, spectral lines)"
      [Suggested: Atomic structure and spectral lines]

── STEM_CHEM ──
C1. "What chemistry background do you have?
     (none / high school / university general chem /
      organic chem completed)"
     [Suggested: University general chemistry]
C2. "Do you need to memorize reactions and mechanisms,
     solve quantitative problems, or both?"
     [Suggested: Both]
C3. "Are there specific reaction types or topics
     you know will appear on your exam or project?"
     [Suggested: Reaction mechanisms and spectroscopy]

── STEM_BIO ──
B1. "Do you have a background in cell biology or
     general biology already?"
     [Suggested: Basic high school biology]
B2. "Is this for a specific exam, lab course,
     or general knowledge building?"
     [Suggested: University anatomy exam]
B3. "Are there specific systems or topics you
     need to prioritize?"
     [Suggested: Nervous system and endocrine system]

── STEM_CS ──
CS1. "What programming languages are you comfortable in?
      (none / Python / JS / C++ / Java / etc.)"
      [Suggested: Intermediate Python]
CS2. "Is your focus theoretical (algorithms, math proofs)
      or practical (building projects, passing interviews)?"
      [Suggested: Practical project-building]
CS3. "Do you have a specific stack, framework, or tool
      in mind?"
      [Suggested: React Native and TypeScript]

── LANGUAGE ──
L1. "What is your current level in this language?
     (absolute zero / know some words / A2 / B1 / B2)"
     [Suggested: A1 — know basic alphabet and phrases]
L2. "What is your primary goal:
     speaking fluency / reading literature / passing an exam?"
     [Suggested: Conversational speaking fluency]
L3. "Have you learned any other foreign languages before?
     (Knowing grammar from another language helps)"
     [Suggested: Learned some French in school]

── MUSIC ──
MU1. "Do you read sheet music or chord charts,
      or learn by ear?"
      [Suggested: Chord charts and tabs]
MU2. "Do you have your instrument available to practice
      daily right now?"
      [Suggested: Yes, acoustic guitar]
MU3. "What specific piece, style, or technique is your
      milestone goal?"
      [Suggested: Fingerstyle chord melody]

── HUMANITIES ──
H1. "What primary texts, eras, or thinkers do you
     most want to understand?"
     [Suggested: 20th century existentialism — Sartre, Camus]
H2. "Are you writing an essay or thesis, or reading
     for personal depth and understanding?"
     [Suggested: Personal depth and discussion capability]
H3. "Do you have a reading list already, or do you need
     curated recommendations?"
     [Suggested: Need recommendations from primary sources]

── PROFESSIONAL ──
PR1. "What is your current role and what role are you
      targeting with this learning?"
      [Suggested: Junior developer targeting Senior role]
PR2. "Will you be applying this on real work projects
      simultaneously?"
      [Suggested: Yes, on a live production app]
PR3. "Do you need certification preparation or practical
      on-the-job mastery?"
      [Suggested: Practical mastery and portfolio artifact]

── OTHER ──
O1. "What prior experience do you have that is related
     to this topic, even indirectly?"
     [Suggested: Complete beginner, no prior background]
O2. "What does success look like at the end of this plan?
     Describe what you will be able to do."
     [Suggested: Able to build and explain a complete project]
O3. "Are there any specific resources, people, or courses
     you want integrated?"
     [Suggested: Open to the best available resources]

═══════════════════════════════════════
FINAL STEP — THE MASTER PROMPT HANDOFF
═══════════════════════════════════════
Once all questions are answered, output EXACTLY this:

"Thank you. Your learner profile is complete.
Here is your Step 2 Master Prompt. Copy everything inside the
box below and proceed to Step 2:"

[Generate a customized, comprehensive Master Prompt that
synthesizes every single answer the user gave, tailored to their
exact timeline, daily hours, current level, and topic category.]`;

const STEP2_PROMPT = `Based on our Socratic Diagnostic Interview, generate a curated list of the top 3-5 authoritative textbooks and sources for this learning roadmap.

Output the results with:
1. Book/Source Title and Author
2. Why this source is uniquely suited for my background
3. Key chapters directly relevant to my goal

Then prepare to synthesize these sources into a day-by-day JSON study plan for LifePivot.`;

// ── CopyButton ───────────────────────────────────────────────────────────────

function CopyPromptButton({
  text,
  stepNum,
  primaryColor,
  emeraldColor,
}: {
  text: string;
  stepNum: number;
  primaryColor: string;
  emeraldColor: string;
}) {
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();

  const handleCopy = async () => {
    HapticsEngine.tier1.light();
    try {
      await Share.share({ message: text, title: `Step ${stepNum} Prompt` });
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      Alert.alert('Copy Failed', 'Could not share the prompt. Please try again.');
    }
  };

  return (
    <View style={{ alignItems: 'flex-end' }}>
      <TouchableOpacity
        onPress={handleCopy}
        activeOpacity={0.8}
        style={[
          styles.copyBtn,
          {
            borderColor: copied ? `${emeraldColor}66` : `${primaryColor}40`,
            backgroundColor: copied ? `${emeraldColor}20` : `${primaryColor}15`,
          },
        ]}
      >
        <Ionicons
          name={copied ? 'checkmark' : 'copy-outline'}
          size={13}
          color={copied ? emeraldColor : primaryColor}
        />
        <Text style={[styles.copyBtnText, { color: copied ? emeraldColor : primaryColor }]}>
          {copied ? (t('pro_curriculum.shared') || 'SHARED!') : (t('pro_curriculum.copy_prompt') || 'COPY PROMPT')}
        </Text>
      </TouchableOpacity>
      {Platform.OS === 'android' && !copied && (
        <Text style={styles.copyHint}>Tap Share → select Copy to Clipboard</Text>
      )}
    </View>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ProCurriculumScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const stepTitles = [
    t('pro_curriculum.step1_title') || 'AI Socratic Diagnostic Interview',
    t('pro_curriculum.step2_title') || 'Upload Course Materials & Textbooks',
    t('pro_curriculum.step3_title') || 'Import Generated Learning Plan',
  ];
  const stepSubtitles = [
    t('pro_curriculum.step1_subtitle') || 'Run the interactive prompt below in any AI to extract your precise syllabus requirements.',
    t('pro_curriculum.step2_subtitle') || 'Supply PDFs, lecture slides, or chapter outlines to anchor the AI generation.',
    t('pro_curriculum.step3_subtitle') || 'Paste the final structured JSON from the AI to instantly populate your LifePivot roadmap.',
  ];
  const stepWhere = [
    'ChatGPT, Claude, or Gemini',
    'Gemini Notebook / Note-taking AI',
    'LifePivot Plan Importer',
  ];
  const stepTips = [
    'The AI will interview you and generate a Master Prompt at the end. Copy that Master Prompt — you will use it in Step 3.',
    'Upload the recommended sources to a new Gemini Notebook (gemini.google.com/notebook).',
    'Copy the JSON output and use the Import button below to create your plan.',
  ];
  const step3Instructions = [
    'Copy the structured JSON generated by your AI tutor.',
    'Open the LifePivot JSON Importer below.',
    'Paste the curriculum and review your prioritized tasks.',
    'Tap Import to generate your active daily schedule.',
    'Track your streak, focus timers, and Socratic drills!',
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Background Ambient Glows */}
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
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <FadeInView delay={0}>
          {/* PRO badge */}
          <View
            style={[
              styles.proBadge,
              {
                backgroundColor: `${colors.secondary}18`,
                borderColor: `${colors.secondary}33`,
              },
            ]}
          >
            <View style={[styles.proBadgeDot, { backgroundColor: colors.secondary }]} />
            <Text style={[styles.proBadgeText, { color: colors.secondary }]}>
              {t('pro_curriculum.badge') || 'PRO FEATURE'}
            </Text>
          </View>

          <Text style={styles.pageTitle}>{t('pro_curriculum.title') || 'Professional Curriculum Builder'}</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            {t('pro_curriculum.subtitle') || 'Build a source-grounded study plan using your real textbooks and AI — in 3 steps.'}
          </Text>

          <View
            style={[
              styles.aiNote,
              {
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderColor: colors.glassBorder,
              },
            ]}
          >
            <Text style={[styles.aiNoteLabel, { color: colors.textMuted }]}>{t('pro_curriculum.works_with') || 'Works with'} </Text>
            <Text style={styles.aiNoteValue}>{t('pro_curriculum.models') || 'Claude · ChatGPT · Gemini · Any AI'}</Text>
          </View>
        </FadeInView>

        {/* ── Step 1 ──────────────────────────────────────────────────── */}
        <FadeInView delay={80}>
          <StepCard
            stepNum={1}
            prompt={STEP1_PROMPT}
            title={stepTitles[0]}
            subtitle={stepSubtitles[0]}
            where={stepWhere[0]}
            tip={stepTips[0]}
            color={colors.primary}
            cardBg={colors.card}
            glassBorder={colors.glassBorder}
            primaryColor={colors.primary}
            emeraldColor={colors.emerald}
          />
        </FadeInView>

        {/* ── Step 2 ──────────────────────────────────────────────────── */}
        <FadeInView delay={160}>
          <StepCard
            stepNum={2}
            prompt={STEP2_PROMPT}
            title={stepTitles[1]}
            subtitle={stepSubtitles[1]}
            where={stepWhere[1]}
            tip={stepTips[1]}
            color={colors.secondary}
            cardBg={colors.card}
            glassBorder={colors.glassBorder}
            primaryColor={colors.primary}
            emeraldColor={colors.emerald}
          />
        </FadeInView>

        {/* ── Step 3 (instructions only) ──────────────────────────────── */}
        <FadeInView delay={240}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: `${colors.emerald}33`,
              },
            ]}
          >
            {/* Step header */}
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.stepCircle,
                  {
                    backgroundColor: `${colors.emerald}18`,
                    borderColor: `${colors.emerald}40`,
                  },
                ]}
              >
                <Text style={[styles.stepNumber, { color: colors.emerald }]}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepLabel, { color: colors.emerald }]}>STEP 3</Text>
                <Text style={styles.stepTitle}>{stepTitles[2]}</Text>
                <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>{stepSubtitles[2]}</Text>
              </View>
            </View>

            {/* Where */}
            <View
              style={[
                styles.whereRow,
                {
                  backgroundColor: `${colors.emerald}08`,
                  borderColor: `${colors.emerald}20`,
                },
              ]}
            >
              <Text style={[styles.whereLabel, { color: `${colors.emerald}99` }]}>WHERE </Text>
              <Text style={[styles.whereValue, { color: colors.emerald }]}>{stepWhere[2]}</Text>
            </View>

            {/* Instructions */}
            <View style={styles.instructionsList}>
              {step3Instructions.map((instruction, i) => (
                <View key={i} style={styles.instructionItem}>
                  <View
                    style={[
                      styles.instructionNumber,
                      {
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        borderColor: colors.glassBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.instructionNumberText, { color: colors.primary }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.instructionText, { color: colors.textSecondary }]}>{instruction}</Text>
                </View>
              ))}
            </View>

            {/* Pro note */}
            <View
              style={[
                styles.tipBox,
                {
                  backgroundColor: `${colors.emerald}08`,
                  borderColor: `${colors.emerald}20`,
                },
              ]}
            >
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '900', color: colors.emerald }}>💡 Note: </Text>
                Your curriculum will describe concrete concepts, exercises, and drills. Textbooks anchor the quality of your syllabus seamlessly.
              </Text>
            </View>

            {/* What your plan will have */}
            <View style={styles.planPerks}>
              {[
                'Every task grounded in your real textbooks',
                'P0–P5 priorities for the Pivot Engine to manage',
                'Automatic recovery if you miss sessions',
                'XP and gamification on every task',
              ].map((perk) => (
                <View key={perk} style={styles.perkRow}>
                  <View style={[styles.perkDot, { backgroundColor: colors.emerald }]} />
                  <Text style={[styles.perkText, { color: colors.textSecondary }]}>{perk}</Text>
                </View>
              ))}
            </View>
          </View>
        </FadeInView>

        {/* ── Import CTA ───────────────────────────────────────────────── */}
        <FadeInView delay={320}>
          <View style={styles.ctaSection}>
            <Text style={[styles.ctaLabel, { color: colors.textMuted }]}>AFTER GENERATING YOUR PLAN</Text>
            <TouchableOpacity
              onPress={() => {
                HapticsEngine.tier2.action();
                router.push('/plan/import');
              }}
              activeOpacity={0.85}
              style={[
                styles.ctaButton,
                {
                  backgroundColor: `${colors.primary}18`,
                  borderColor: colors.primary,
                },
              ]}
            >
              <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
              <Text style={[styles.ctaButtonText, { color: colors.primary }]}>
                {(t('plan_import.title') || 'IMPORT PLAN JSON').toUpperCase()} →
              </Text>
            </TouchableOpacity>
            <Text style={[styles.ctaNote, { color: colors.textMuted }]}>
              {t('plan_import.subtitle') || 'Paste structured JSON curriculum from Gemini Notebook or AI tutors'}
            </Text>
          </View>
        </FadeInView>
      </ScrollView>
    </View>
  );
}

// ── StepCard component ───────────────────────────────────────────────────────

function StepCard({
  stepNum,
  prompt,
  title,
  subtitle,
  where,
  tip,
  color,
  cardBg,
  glassBorder,
  primaryColor,
  emeraldColor,
}: {
  stepNum: number;
  prompt: string;
  title: string;
  subtitle: string;
  where: string;
  tip: string;
  color: string;
  cardBg: string;
  glassBorder: string;
  primaryColor: string;
  emeraldColor: string;
}) {
  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: `${color}25` }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.stepCircle, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
          <Text style={[styles.stepNumber, { color }]}>{stepNum}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.stepLabel, { color }]}>STEP {stepNum}</Text>
          <Text style={styles.stepTitle}>{title}</Text>
          <Text style={styles.stepSubtitle}>{subtitle}</Text>
        </View>
      </View>

      {/* Where */}
      <View style={[styles.whereRow, { backgroundColor: `${color}08`, borderColor: `${color}18` }]}>
        <Text style={[styles.whereLabel, { color: `${color}99` }]}>WHERE </Text>
        <Text style={[styles.whereValue, { color }]} numberOfLines={2}>{where}</Text>
      </View>

      {/* Prompt label + copy button */}
      <View style={styles.promptHeader}>
        <Text style={styles.promptLabel}>PROMPT</Text>
        <CopyPromptButton
          text={prompt}
          stepNum={stepNum}
          primaryColor={primaryColor}
          emeraldColor={emeraldColor}
        />
      </View>

      {/* Prompt preview — scrollable */}
      <View style={[styles.promptBox, { borderColor: glassBorder }]}>
        <ScrollView
          style={styles.promptScroll}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.promptText}>{prompt}</Text>
        </ScrollView>
        <View style={styles.promptFade} pointerEvents="none" />
      </View>

      {/* Tip */}
      <View style={[styles.tipBox, { backgroundColor: `${color}06`, borderColor: `${color}15` }]}>
        <Text style={styles.tipText}>
          <Text style={[styles.tipBold, { color }]}>After copying: </Text>
          {tip}
        </Text>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

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
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 80,
    gap: 16,
  },
  // Header
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  proBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 32,
    marginBottom: 10,
  },
  pageSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  aiNote: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  aiNoteLabel: {
    fontSize: 10,
  },
  aiNoteValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D1D5DB',
  },
  // Cards
  card: {
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    padding: 20,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '900',
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  stepSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  // Where row
  whereRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  whereLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  whereValue: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  // Prompt
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  promptLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#8A92A6',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  copyBtnText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  copyHint: {
    fontSize: 9,
    color: '#8A92A6',
    marginTop: 4,
    textAlign: 'right',
  },
  promptBox: {
    height: 160,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  promptScroll: {
    flex: 1,
    padding: 12,
  },
  promptText: {
    fontSize: 10,
    color: '#8A92A6',
    lineHeight: 16,
    fontFamily: 'Courier',
  },
  promptFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    backgroundColor: 'transparent',
  },
  // Tip
  tipBox: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  tipText: {
    fontSize: 11,
    lineHeight: 17,
  },
  tipBold: {
    fontWeight: '900',
  },
  // Instructions (step 3)
  instructionsList: {
    gap: 10,
    marginBottom: 14,
  },
  instructionItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  instructionNumber: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  instructionNumberText: {
    fontSize: 10,
    fontWeight: '900',
  },
  instructionText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  // Plan perks
  planPerks: {
    marginTop: 14,
    gap: 6,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  perkDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.8,
  },
  perkText: {
    fontSize: 11,
  },
  // CTA
  ctaSection: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  ctaLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    ...Shadows.card,
  },
  ctaButtonText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  ctaNote: {
    marginTop: 10,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 280,
  },
});
