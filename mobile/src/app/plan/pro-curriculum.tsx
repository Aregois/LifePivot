import React, { useState } from 'react'
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Share,
    Alert,
    StyleSheet,
    Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { C, BorderRadius, Shadows } from '../../constants/theme'
import { FadeInView } from '../../components/ui'

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
CS1. "What programming languages do you already
      know, and at what level?"
      [Suggested: Python basics, no algorithms]
CS2. "Is this for a job interview, a university course,
      a personal project, or general skill building?"
      [Suggested: Job interview preparation]
CS3. "Do you prefer learning through reading and
      theory first, or building projects immediately?"
      [Suggested: Projects — learn by doing]
CS4. "Are there specific topics you know you must
      cover? (e.g. trees, dynamic programming, system
      design, REST APIs)"
      [Suggested: Arrays, trees, and dynamic programming]

── LANGUAGE ──
L1. "What is your current level in this language?
     (complete beginner / can read basics /
      can hold simple conversations / intermediate)"
     [Suggested: Complete beginner]
L2. "What is your primary goal — speaking fluency,
     reading/writing, passing a proficiency exam,
     or travel survival?"
     [Suggested: Speaking fluency]
L3. "How many new words per day are you comfortable
     memorizing?"
     [Suggested: 10–15 words/day]
L4. "Do you have any exposure to related languages
     that might help? (e.g. knowing Spanish helps
     with Italian)"
     [Suggested: No related language background]

── MUSIC ──
MU1. "What instrument or musical skill are you
      learning, and what is your current level?"
      [Suggested: Guitar — complete beginner]
MU2. "Can you already read sheet music or use
      tabs/chord charts?"
      [Suggested: Can read basic tabs]
MU3. "Is your goal to perform a specific piece,
      pass a grade exam, or build general technique?"
      [Suggested: Build general technique and learn
       3–4 songs]
MU4. "How much of your daily time can be spent
      on active instrument practice vs theory study?"
      [Suggested: 70% practice, 30% theory]

── HUMANITIES ──
H1. "What is your existing background in this subject?
     (no background / casual interest /
      studied it formally)"
     [Suggested: Casual interest, no formal study]
H2. "Is this for an academic essay, exam, debate
     preparation, or personal understanding?"
     [Suggested: University exam]
H3. "Are there specific thinkers, events, periods,
     or arguments you must cover?"
     [Suggested: Enlightenment philosophy and
      Kant's major works]

── PROFESSIONAL ──
PR1. "What is your current professional background
      related to this topic?"
      [Suggested: Entry-level, no formal training]
PR2. "Is this for a certification exam, a new job role,
      a promotion, or freelance work?"
      [Suggested: Certification exam]
PR3. "Are there specific frameworks, tools, or
      standards you must know?"
      [Suggested: Agile, Scrum, and PMP framework]

── OTHER ──
O1. "What do you already know about this topic?"
    [Suggested: Very basics, self-taught]
O2. "What would success look like for you at
     the end of this plan?"
     [Suggested: Be able to apply it independently]
O3. "Are there specific aspects of this topic
     you know you need to focus on?"
     [Suggested: Practical application over theory]

═══════════════════════════════════════
PHASE 2 COMPLETION — CONFIRMATION CARD
═══════════════════════════════════════
After all Phase 2 questions are answered, show:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ DIAGNOSTIC COMPLETE — LEARNER PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Topic:          [T]
Daily Hours:    [H] hrs/day
Objective:      [O]
Duration:       [D] days
Topic Category: [CATEGORY]
Prior Knowledge: [summary of Phase 2 answers]
Key Focus Areas: [list the specific subtopics/skills
                  the user identified as priorities]
Starting Level:  [Beginner / Pre-Intermediate /
                  Intermediate / Advanced]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Then immediately generate the MASTER PROMPT below.

═══════════════════════════════════════
MASTER PROMPT GENERATION
═══════════════════════════════════════
Generate a single self-contained prompt the user will
paste into Gemini Notebook to generate their full
learning plan as JSON.

The Master Prompt must:

1. Include the full learner profile inline
   (all parameters + prior knowledge + focus areas)

2. Instruct Gemini Notebook to use uploaded source
   books as structural and conceptual references to
   BUILD the curriculum — NOT to assign them as
   required reading. Tasks should reflect the
   knowledge from the books without telling the
   user to "read Chapter X." The books are the
   teacher's resource, not the student's homework.
   Exception: if the user explicitly has their own
   textbooks (Route B), tasks CAN reference chapters.

3. Instruct Gemini Notebook to output ONLY a raw
   JSON array — no markdown, no explanation,
   no text before or after the array.

4. Use this exact task schema (one object per line):
   {
     "day": 1,
     "title": "Task title describing what to do",
     "priority": 2,
     "estimated_mins": 45,
     "subject": "SCIENCE",
     "subtasks": [],
     "level": "Intermediate",
     "goal_intent": "Exam",
     "commitment_hours_per_week": 10.5
   }

   Note: level, goal_intent, commitment_hours_per_week
   appear only on DAY 1 TASK as plan metadata.
   All other tasks omit these three fields.

5. Include these priority rules:
   P5 Deep Theory: fundamental proofs, derivations,
     research-level analysis
     → 4–5 subtasks, max 1 per day
     → In plans 31+ days: P0 Void Day must follow
   P4 Hard Application: problem sets, coding tasks,
     calculations, written arguments
     → 3–4 subtasks
   P3 Standard Practice: exercises, drills, speaking,
     ear training, active recall sessions
     → exactly 2 subtasks
   P2 Theory Overview: conceptual understanding,
     mental model building, watching explanations
     → no subtasks (subtasks: [])
   P1 Light Exercises: vocabulary, flashcards,
     quick drills, short repetition tasks
     → no subtasks
   P0 Void Day: rest and recovery only
     → title must be exactly "VOID DAY"
     → no subtasks
     → estimated_mins: 90

6. Include these Void Day rules:
   - 30-day plans: 1 Void Day every 6 days
   - 31–90 day plans: 1 Void Day every 7 days
     + 1 after every P5 day
   - Never place a Void Day on Day 1 or the final day

7. Include this subject mapping rule:
   The "subject" field must be one of:
   TECH / SCIENCE / MATH / HISTORY / ARTS / GENERAL
   Choose based on the topic:
   CS/programming → TECH
   Physics/Chemistry/Biology → SCIENCE
   Mathematics → MATH
   History/Philosophy/Literature → HISTORY
   Music/Visual Arts/Design → ARTS
   Everything else → GENERAL

8. End the Master Prompt with this exact instruction:
   "Output only the raw JSON array starting with [
   and ending with ]. No markdown code blocks.
   No explanation. No text before or after the array."

═══════════════════════════════════════
BEGIN
═══════════════════════════════════════
Start now. Greet the user in one sentence and ask
Phase 1, Question 1 about their topic.`

const STEP2_PROMPT = `Now that my diagnostic parameters are confirmed, act as
LifePivot's Head of Academic Acquisitions.

Your task: generate a precise, non-redundant reading list
of authoritative sources that will serve as the foundation
for my study plan. These sources will be uploaded to
Gemini Notebook to ground every task in real content.

CURATION RULES:
- Recommend exactly 2 to 5 sources. No more, no less.
- Match difficulty and depth to my objective and timeline.
- Do not recommend overlapping or redundant materials.
- Prioritize: official documentation, foundational textbooks,
  industry-standard references, or peer-reviewed materials.
- If my timeline is short (under 14 days), recommend fewer,
  more focused sources — not comprehensive textbooks.
- For each source provide:
  · Full title and author(s)
  · Specific chapters or sections to focus on (not the whole book)
  · One sentence explaining why this source is essential
  · Whether it is freely available online or must be purchased

OUTPUT FORMAT:
Present as a clean table with these columns:
| Title | Author | Focus Chapters | Why Essential | Availability |

After the table, add a short paragraph titled
"How to add these to Gemini Notebook:" explaining that
the user should search for these sources, obtain PDFs
or access online versions, and upload them to a new
Gemini Notebook dedicated to this study plan.
Do not suggest illegal download sources.`

const STEP3_INSTRUCTIONS = [
    'Open Gemini Notebook at gemini.google.com/notebook',
    'Open the notebook you created in Step 2 (with your uploaded source files)',
    'Go to the chat input area and paste the Master Prompt generated at the end of your Step 1 chat',
    'Send it — Gemini Notebook will read your sources and output a complete JSON plan',
    'Copy the JSON output, then use "Import JSON Plan" below to create your plan in LifePivot',
]

// ── Step colors ──────────────────────────────────────────────────────────────

const STEP_COLORS = ['#00F0FF', '#BD00FF', '#F59E0B']
const STEP_TITLES = ['Grill-Me Diagnostic', 'Find Your Sources', 'Generate in Gemini Notebook']
const STEP_SUBTITLES = [
    'Get a personalized Master Prompt',
    'Get an authoritative reading list',
    'Grounded in your real textbooks',
]
const STEP_WHERE = [
    'Paste into Claude, ChatGPT, or Gemini',
    'Paste into the same chat after Step 1',
    'Paste your Master Prompt into Gemini Notebook',
]
const STEP_TIPS = [
    'The AI will interview you and generate a Master Prompt at the end. Copy that Master Prompt — you will use it in Step 3.',
    'Upload the recommended sources to a new Gemini Notebook (gemini.google.com/notebook).',
    'Copy the JSON output and use the Import button below to create your plan.',
]

// ── CopyButton ───────────────────────────────────────────────────────────────

function CopyPromptButton({ text, stepNum }: { text: string; stepNum: number }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        try {
            await Share.share({ message: text, title: `Step ${stepNum} Prompt` })
            setCopied(true)
            setTimeout(() => setCopied(false), 3000)
        } catch {
            Alert.alert('Copy Failed', 'Could not share the prompt. Please try again.')
        }
    }

    return (
        <View style={{ alignItems: 'flex-end' }}>
            <TouchableOpacity
                onPress={handleCopy}
                activeOpacity={0.8}
                style={[
                    styles.copyBtn,
                    copied && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }
                ]}
            >
                <Ionicons
                    name={copied ? 'checkmark' : 'copy-outline'}
                    size={13}
                    color={copied ? '#10B981' : C.electricBlue}
                />
                <Text style={[styles.copyBtnText, copied && { color: '#10B981' }]}>
                    {copied ? 'SHARED!' : 'COPY PROMPT'}
                </Text>
            </TouchableOpacity>
            {Platform.OS === 'android' && !copied && (
                <Text style={styles.copyHint}>Tap Share → select Copy to Clipboard</Text>
            )}
        </View>
    )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ProCurriculumScreen() {
    const router = useRouter()

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {/* ── Header ──────────────────────────────────────────────────── */}
            <FadeInView delay={0}>
                {/* PRO badge */}
                <View style={styles.proBadge}>
                    <View style={styles.proBadgeDot} />
                    <Text style={styles.proBadgeText}>PRO FEATURE</Text>
                </View>

                <Text style={styles.pageTitle}>Professional{'\n'}Curriculum Builder</Text>
                <Text style={styles.pageSubtitle}>
                    Build a source-grounded study plan using your real textbooks and AI — in 3 steps.
                </Text>

                <View style={styles.aiNote}>
                    <Text style={styles.aiNoteLabel}>Works with  </Text>
                    <Text style={styles.aiNoteValue}>Claude · ChatGPT · Gemini · Any AI</Text>
                </View>
            </FadeInView>

            {/* ── Step 1 ──────────────────────────────────────────────────── */}
            <FadeInView delay={80}>
                <StepCard
                    stepNum={1}
                    prompt={STEP1_PROMPT}
                />
            </FadeInView>

            {/* ── Step 2 ──────────────────────────────────────────────────── */}
            <FadeInView delay={160}>
                <StepCard
                    stepNum={2}
                    prompt={STEP2_PROMPT}
                />
            </FadeInView>

            {/* ── Step 3 (instructions only) ──────────────────────────────── */}
            <FadeInView delay={240}>
                <View style={[styles.card, { borderColor: `${STEP_COLORS[2]}20` }]}>
                    {/* Step header */}
                    <View style={styles.cardHeader}>
                        <View style={[styles.stepCircle, { backgroundColor: `${STEP_COLORS[2]}15`, borderColor: `${STEP_COLORS[2]}40` }]}>
                            <Text style={[styles.stepNumber, { color: STEP_COLORS[2] }]}>3</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.stepLabel, { color: STEP_COLORS[2] }]}>STEP 3</Text>
                            <Text style={styles.stepTitle}>{STEP_TITLES[2]}</Text>
                            <Text style={styles.stepSubtitle}>{STEP_SUBTITLES[2]}</Text>
                        </View>
                    </View>

                    {/* Where */}
                    <View style={[styles.whereRow, { backgroundColor: `${STEP_COLORS[2]}08`, borderColor: `${STEP_COLORS[2]}15` }]}>
                        <Text style={[styles.whereLabel, { color: `${STEP_COLORS[2]}80` }]}>WHERE  </Text>
                        <Text style={[styles.whereValue, { color: `${STEP_COLORS[2]}CC` }]}>{STEP_WHERE[2]}</Text>
                    </View>

                    {/* Instructions */}
                    <View style={styles.instructionsList}>
                        {STEP3_INSTRUCTIONS.map((instruction, i) => (
                            <View key={i} style={styles.instructionItem}>
                                <View style={styles.instructionNumber}>
                                    <Text style={styles.instructionNumberText}>{i + 1}</Text>
                                </View>
                                <Text style={styles.instructionText}>{instruction}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Pro note */}
                    <View style={[styles.tipBox, { backgroundColor: `${STEP_COLORS[2]}08`, borderColor: `${STEP_COLORS[2]}15` }]}>
                        <Text style={[styles.tipText, { color: `${STEP_COLORS[2]}99` }]}>
                            <Text style={{ fontWeight: '900' }}>💡 Note: </Text>
                            if you have no personal textbooks, Gemini Notebook will use the uploaded sources to structure your curriculum — but your tasks will describe what to practice and understand, not what pages to read. The books shape the plan quality invisibly.
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
                                <View style={[styles.perkDot, { backgroundColor: STEP_COLORS[2] }]} />
                                <Text style={styles.perkText}>{perk}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </FadeInView>

            {/* ── Import CTA ───────────────────────────────────────────────── */}
            <FadeInView delay={320}>
                <View style={styles.ctaSection}>
                    <Text style={styles.ctaLabel}>AFTER GENERATING YOUR PLAN</Text>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                            router.push('/plan/import')
                        }}
                        activeOpacity={0.85}
                        style={styles.ctaButton}
                    >
                        <Ionicons name="cloud-upload-outline" size={18} color={C.electricBlue} />
                        <Text style={styles.ctaButtonText}>IMPORT JSON PLAN →</Text>
                    </TouchableOpacity>
                    <Text style={styles.ctaNote}>
                        Paste the JSON from Gemini Notebook to create your plan instantly
                    </Text>
                </View>
            </FadeInView>
        </ScrollView>
    )
}

// ── StepCard component ───────────────────────────────────────────────────────

function StepCard({ stepNum, prompt }: { stepNum: number; prompt: string }) {
    const color = STEP_COLORS[stepNum - 1]
    return (
        <View style={[styles.card, { borderColor: `${color}20` }]}>
            {/* Header */}
            <View style={styles.cardHeader}>
                <View style={[styles.stepCircle, { backgroundColor: `${color}15`, borderColor: `${color}40` }]}>
                    <Text style={[styles.stepNumber, { color }]}>{stepNum}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.stepLabel, { color }]}>STEP {stepNum}</Text>
                    <Text style={styles.stepTitle}>{STEP_TITLES[stepNum - 1]}</Text>
                    <Text style={styles.stepSubtitle}>{STEP_SUBTITLES[stepNum - 1]}</Text>
                </View>
            </View>

            {/* Where */}
            <View style={[styles.whereRow, { backgroundColor: `${color}08`, borderColor: `${color}15` }]}>
                <Text style={[styles.whereLabel, { color: `${color}80` }]}>WHERE  </Text>
                <Text style={[styles.whereValue, { color: `${color}CC` }]} numberOfLines={2}>{STEP_WHERE[stepNum - 1]}</Text>
            </View>

            {/* Prompt label + copy button */}
            <View style={styles.promptHeader}>
                <Text style={styles.promptLabel}>PROMPT</Text>
                <CopyPromptButton text={prompt} stepNum={stepNum} />
            </View>

            {/* Prompt preview — scrollable */}
            <View style={styles.promptBox}>
                <ScrollView
                    style={styles.promptScroll}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.promptText}>{prompt}</Text>
                </ScrollView>
                {/* Fade overlay */}
                <View style={styles.promptFade} pointerEvents="none" />
            </View>

            {/* Tip */}
            <View style={[styles.tipBox, { backgroundColor: `${color}06`, borderColor: `${color}12` }]}>
                <Text style={styles.tipText}>
                    <Text style={styles.tipBold}>After copying: </Text>
                    {STEP_TIPS[stepNum - 1]}
                </Text>
            </View>
        </View>
    )
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050508',
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
        backgroundColor: 'rgba(189, 0, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(189, 0, 255, 0.2)',
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    proBadgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#BD00FF',
    },
    proBadgeText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 2,
        color: '#BD00FF',
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
        color: '#9CA3AF',
        lineHeight: 20,
        marginBottom: 12,
    },
    aiNote: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    aiNoteLabel: {
        fontSize: 10,
        color: '#6B7280',
    },
    aiNoteValue: {
        fontSize: 10,
        fontWeight: '700',
        color: '#D1D5DB',
    },
    // Cards
    card: {
        borderRadius: BorderRadius.xxl,
        backgroundColor: '#141824CC',
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
        color: '#6B7280',
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
        color: '#4B5563',
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
        backgroundColor: 'rgba(0, 240, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(0, 240, 255, 0.2)',
    },
    copyBtnText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#00F0FF',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    copyHint: {
        fontSize: 9,
        color: '#4B5563',
        marginTop: 4,
        textAlign: 'right',
    },
    promptBox: {
        height: 160,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
        marginBottom: 14,
    },
    promptScroll: {
        flex: 1,
        padding: 12,
    },
    promptText: {
        fontSize: 10,
        color: '#6B7280',
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
        color: '#9CA3AF',
        lineHeight: 17,
    },
    tipBold: {
        fontWeight: '900',
        color: '#D1D5DB',
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
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 1,
    },
    instructionNumberText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#6B7280',
    },
    instructionText: {
        fontSize: 12,
        color: '#D1D5DB',
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
        opacity: 0.6,
    },
    perkText: {
        fontSize: 11,
        color: '#9CA3AF',
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
        color: '#4B5563',
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
        backgroundColor: 'rgba(0, 240, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(0, 240, 255, 0.2)',
        ...Shadows.card,
    },
    ctaButtonText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    ctaNote: {
        marginTop: 10,
        fontSize: 11,
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 16,
        maxWidth: 280,
    },
})
