'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, Copy, Check, BookOpen, Search, Sparkles, Upload } from 'lucide-react'

// ── Prompt constants ────────────────────────────────────────────────────────

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
    { icon: '📓', text: 'Open Gemini Notebook at gemini.google.com/notebook' },
    { icon: '📂', text: 'Open the notebook you created in Step 2 (with your uploaded source files)' },
    { icon: '📋', text: 'Go to the chat input area and paste the Master Prompt generated at the end of your Step 1 chat' },
    { icon: '🚀', text: 'Send it — Gemini Notebook will read your sources and output a complete JSON plan' },
    { icon: '📥', text: 'Copy the JSON output, then use the "Import Plan" button below to create your plan in LifePivot' },
]

// ── CopyButton component ────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy Prompt' }: { text: string; label?: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea')
            textarea.value = text
            textarea.style.position = 'fixed'
            textarea.style.opacity = '0'
            document.body.appendChild(textarea)
            textarea.focus()
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 active:scale-95 ${
                copied
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                    : 'bg-[#00F0FF]/10 border border-[#00F0FF]/20 text-[#00F0FF] hover:bg-[#00F0FF]/20'
            }`}
        >
            {copied ? (
                <><Check className="w-3.5 h-3.5" /> Copied!</>
            ) : (
                <><Copy className="w-3.5 h-3.5" /> {label}</>
            )}
        </button>
    )
}

// ── Step card icons ─────────────────────────────────────────────────────────

const STEP_ICONS = [BookOpen, Search, Sparkles]

// ── Main page ───────────────────────────────────────────────────────────────

export default function ProCurriculumPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-[#050508] text-white">
            {/* Background ambient glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#00F0FF] opacity-[0.04] blur-[80px]" />
                <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full bg-[#BD00FF] opacity-[0.04] blur-[80px]" />
            </div>

            <div className="relative max-w-2xl mx-auto px-5 pt-6 pb-32">

                {/* ── Back button ──────────────────────────────────────────── */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-[#00F0FF] transition-colors mb-8 group"
                >
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    Back to Plans
                </button>

                {/* ── Header section ───────────────────────────────────────── */}
                <div className="mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#BD00FF]/10 border border-[#BD00FF]/20 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#BD00FF] animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#BD00FF]">Pro Feature</span>
                    </div>

                    <h1 className="text-3xl font-black tracking-tight text-white mb-3 leading-tight">
                        Professional<br />Curriculum Builder
                    </h1>

                    <p className="text-sm text-gray-400 leading-relaxed mb-3">
                        Build a source-grounded study plan using your real textbooks and AI — in 3 steps.
                    </p>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] w-fit">
                        <span className="text-[10px] text-gray-500 font-medium">Works with</span>
                        <span className="text-[10px] font-bold text-gray-300">Claude · ChatGPT · Gemini · Any AI</span>
                    </div>
                </div>

                {/* ── Step 1: Grill-Me Diagnostic ──────────────────────────── */}
                <StepCard
                    stepNumber={1}
                    icon={STEP_ICONS[0]}
                    title="Grill-Me Diagnostic"
                    subtitle="Get a personalized Master Prompt from your AI"
                    where="Paste into Claude, ChatGPT, or Gemini"
                    tip="The AI will interview you and generate a Master Prompt at the end. Copy that Master Prompt — you will use it in Step 3."
                    promptText={STEP1_PROMPT}
                    accentColor="#00F0FF"
                />

                {/* ── Step 2: Find Your Sources ─────────────────────────────── */}
                <StepCard
                    stepNumber={2}
                    icon={STEP_ICONS[1]}
                    title="Find Your Sources"
                    subtitle="Get an authoritative reading list matched to your goal"
                    where="Paste into the same chat after Step 1"
                    tip="Upload the recommended sources to a new Gemini Notebook (gemini.google.com/notebook)."
                    promptText={STEP2_PROMPT}
                    accentColor="#BD00FF"
                />

                {/* ── Step 3: Generate in Gemini Notebook ──────────────────── */}
                <div className="rounded-[2rem] border border-white/[0.07] bg-gradient-to-b from-[#141824]/80 to-[#0d1020]/60 backdrop-blur-sm p-6 mb-4 shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
                    {/* Step header */}
                    <div className="flex items-start gap-4 mb-5">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center">
                            <span className="text-[13px] font-black text-[#F59E0B]">3</span>
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F59E0B]">Generate in Gemini Notebook</span>
                            </div>
                            <h3 className="text-base font-black text-white">Generate Your Plan</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Grounded in your real textbooks</p>
                        </div>
                    </div>

                    {/* Where */}
                    <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/10">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#F59E0B]/60">Where</span>
                        <span className="text-[11px] font-bold text-[#F59E0B]/80">Paste your Master Prompt into Gemini Notebook</span>
                    </div>

                    {/* Numbered instructions */}
                    <div className="space-y-3 mb-5">
                        {STEP3_INSTRUCTIONS.map((item, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mt-0.5">
                                    <span className="text-[10px] font-black text-gray-500">{i + 1}</span>
                                </div>
                                <p className="text-[12px] text-gray-300 leading-relaxed flex-1">{item.text}</p>
                            </div>
                        ))}
                    </div>

                    {/* Pro note */}
                    <div className="px-4 py-3 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/10">
                        <p className="text-[11px] text-[#F59E0B]/70 leading-relaxed">
                            <span className="font-black">💡 Note:</span> if you have no personal textbooks, Gemini Notebook will use the uploaded sources to structure your curriculum — but your tasks will describe what to <em>practice and understand</em>, not what pages to read. The books shape the plan quality invisibly.
                        </p>
                    </div>

                    {/* What your plan will have */}
                    <div className="mt-5 space-y-1.5">
                        {[
                            'Every task grounded in your real textbooks',
                            'P0–P5 priorities for the Pivot Engine to manage',
                            'Automatic recovery if you miss sessions',
                            'XP and gamification on every task',
                        ].map((item) => (
                            <div key={item} className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-[#F59E0B]/60 flex-shrink-0" />
                                <span className="text-[11px] text-gray-400">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Bottom CTA ────────────────────────────────────────────── */}
                <div className="mt-8 flex flex-col items-center gap-3">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">After generating your plan</p>
                    <button
                        onClick={() => router.push('/plan/import')}
                        className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-[1.5rem] bg-gradient-to-r from-[#BD00FF]/20 to-[#00F0FF]/20 border border-white/[0.1] text-white font-black text-sm uppercase tracking-wider hover:from-[#BD00FF]/30 hover:to-[#00F0FF]/30 hover:border-white/20 transition-all duration-200 active:scale-[0.98] shadow-[0_4px_30px_rgba(0,0,0,0.4)]"
                    >
                        <Upload className="w-4 h-4 text-[#00F0FF]" />
                        Import Your JSON Plan
                        <ChevronRight className="w-4 h-4 text-[#BD00FF]" />
                    </button>
                    <p className="text-[10px] text-gray-600 text-center leading-relaxed max-w-xs">
                        Paste the JSON from Gemini Notebook to create your plan instantly in LifePivot
                    </p>
                </div>
            </div>
        </div>
    )
}

// ── Reusable StepCard component ─────────────────────────────────────────────

interface StepCardProps {
    stepNumber: number
    icon: React.ElementType
    title: string
    subtitle: string
    where: string
    tip: string
    promptText: string
    accentColor: string
}

function StepCard({
    stepNumber, icon: Icon, title, subtitle, where, tip, promptText, accentColor
}: StepCardProps) {
    return (
        <div
            className="rounded-[2rem] border border-white/[0.07] bg-gradient-to-b from-[#141824]/80 to-[#0d1020]/60 backdrop-blur-sm p-6 mb-4 shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
            style={{ borderColor: `${accentColor}18` }}
        >
            {/* Step header */}
            <div className="flex items-start gap-4 mb-5">
                <div
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                        backgroundColor: `${accentColor}15`,
                        border: `1px solid ${accentColor}40`
                    }}
                >
                    <span className="text-[13px] font-black" style={{ color: accentColor }}>{stepNumber}</span>
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <Icon className="w-4 h-4" style={{ color: accentColor }} />
                        <span
                            className="text-[10px] font-black uppercase tracking-[0.2em]"
                            style={{ color: accentColor }}
                        >
                            Step {stepNumber}
                        </span>
                    </div>
                    <h3 className="text-base font-black text-white">{title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
                </div>
            </div>

            {/* Where to use */}
            <div
                className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl"
                style={{
                    backgroundColor: `${accentColor}08`,
                    border: `1px solid ${accentColor}15`
                }}
            >
                <span
                    className="text-[9px] font-black uppercase tracking-[0.2em]"
                    style={{ color: `${accentColor}80` }}
                >
                    Where
                </span>
                <span
                    className="text-[11px] font-bold"
                    style={{ color: `${accentColor}CC` }}
                >
                    {where}
                </span>
            </div>

            {/* Prompt code block */}
            <div className="relative mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">Prompt</span>
                    <CopyButton text={promptText} />
                </div>
                <div
                    className="relative rounded-xl bg-black/60 border border-white/[0.05] p-4 overflow-hidden"
                    style={{ maxHeight: '220px' }}
                >
                    <div className="overflow-y-auto" style={{ maxHeight: '196px' }}>
                        <pre
                            className="text-[10px] text-gray-400 leading-relaxed font-mono whitespace-pre-wrap break-words"
                            style={{ fontFamily: 'ui-monospace, "Cascadia Code", monospace' }}
                        >
                            {promptText}
                        </pre>
                    </div>
                    {/* Fade at bottom */}
                    <div
                        className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
                        style={{
                            background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.8))'
                        }}
                    />
                </div>
            </div>

            {/* Tip */}
            <div
                className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl"
                style={{
                    backgroundColor: `${accentColor}06`,
                    border: `1px solid ${accentColor}12`
                }}
            >
                <span className="text-sm mt-0.5">💡</span>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                    <span className="font-black text-gray-300">After copying:</span> {tip}
                </p>
            </div>
        </div>
    )
}
