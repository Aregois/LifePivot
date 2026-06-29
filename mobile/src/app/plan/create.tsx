import React, { useState } from 'react'
import {
    View,
    Text,
    TextInput,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { C, Shadows, BorderRadius, Spacing, Typography } from '../../constants/theme'
import { FadeInView, GlassCard, PremiumButton, GradientText, GlowBadge, SegmentedControl } from '../../components/ui'
import { apiRequest } from '../../utils/api'
import { PlanGeneratorLoader } from '../../components/plan/PlanGeneratorLoader'
import { scheduleDailyStudyReminder, requestNotificationPermissions } from '../../utils/notifications'
import { supabase } from '../../utils/supabase'
import { track } from '../../utils/analytics'

const CATEGORIES = [
    { id: 'Coding', label: 'Coding & CS', icon: 'code-slash' },
    { id: 'Science', label: 'Science & Bio', icon: 'flask' },
    { id: 'Math', label: 'Mathematics', icon: 'calculator' },
    { id: 'Languages', label: 'Languages', icon: 'language' },
    { id: 'Humanities', label: 'Humanities', icon: 'book' },
    { id: 'Arts', label: 'Arts & Design', icon: 'color-palette' },
    { id: 'Business', label: 'Business & Econ', icon: 'briefcase' },
    { id: 'Music', label: 'Music & Audio', icon: 'musical-notes' },
    { id: 'History', label: 'History & Lore', icon: 'document-text' },
    { id: 'Social', label: 'Social Sciences', icon: 'people' },
    { id: 'Health', label: 'Health & Fitness', icon: 'barbell' },
    { id: 'Custom', label: 'Custom', icon: 'sparkles' }
]

const INTENTS = [
    { id: 'Exam', label: 'Exam Prep', desc: 'Syllabus coverage & dense pre-exam review' },
    { id: 'Level Up', label: 'Level Up', desc: 'Skill mastery loops with deep theory focus' },
    { id: 'Intro', label: 'Curiosity', desc: 'Interest building with low-pressure progress' }
]

const DURATIONS = [7, 14, 30, 60]

export default function CreatePlan() {
    const router = useRouter()
    const [title, setTitle] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('Coding')
    const [selectedDuration, setSelectedDuration] = useState(30)
    const [levelIndex, setLevelIndex] = useState(0) // 0 = Beginner, 1 = Intermediate, 2 = Advanced
    const [selectedIntent, setSelectedIntent] = useState('Level Up')
    const [dailyHours, setDailyHours] = useState(2)

    // Generation states
    const [isGenerating, setIsGenerating] = useState(false)
    const [generationError, setGenerationError] = useState<string | null>(null)

    const handleCreate = async () => {
        const trimmedTitle = title.trim()
        if (!trimmedTitle) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
            Alert.alert('REQUIRED', 'Please input a goal or topic title to proceed.')
            return
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        setIsGenerating(true)
        setGenerationError(null)

        const levels = ['Beginner', 'Intermediate', 'Advanced']
        const level = levels[levelIndex]

        try {
            // 1. Initialize learning goal metadata
            const initRes = await apiRequest<{ goalId: string }>('/api/plans/create', {
                method: 'POST',
                body: JSON.stringify({
                    title: trimmedTitle,
                    duration_days: selectedDuration,
                    level,
                    goal_intent: selectedIntent,
                    sprint_walls: [], // Empty defaults for now, populated dynamically on backend
                    daily_hours: dailyHours,
                    category: selectedCategory,
                    language: 'en'
                })
            })

            const goalId = initRes.goalId
            const totalMonths = Math.ceil(selectedDuration / 30)

            // 2. Generate task schedules in chunks sequentially to update client progress bar
            for (let i = 0; i < totalMonths; i++) {
                const startDay = i * 30 + 1
                const endDay = Math.min((i + 1) * 30, selectedDuration)

                await apiRequest('/api/plans/generate-tasks', {
                    method: 'POST',
                    body: JSON.stringify({
                        goalId,
                        startDay,
                        endDay
                    })
                })
            }

            // 3. Track analytics event
            track('plan_created', {
                duration: selectedDuration,
                difficulty: level
            })

            // 4. Request notification permissions & schedule daily study reminder
            try {
                const granted = await requestNotificationPermissions()
                if (granted) {
                    // Fetch the count of tasks due today for this plan
                    const todayStr = new Date().toISOString().split('T')[0]
                    const { count } = await supabase
                        .from('tasks')
                        .select('*', { count: 'exact', head: true })
                        .eq('goal_id', goalId)
                        .eq('due_date', todayStr)

                    const taskCount = count || 0
                    await scheduleDailyStudyReminder(trimmedTitle, 1, taskCount, 8, 0)
                }
            } catch (notiErr) {
                console.warn('Failed to register notifications:', notiErr)
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            setIsGenerating(false)

            // Redirect directly to the newly created plan Specification screen
            router.replace({
                pathname: '/plan/[id]',
                params: { id: goalId }
            })
        } catch (err: any) {
            console.error('Error during AI plan generation:', err)
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            setGenerationError(err.message || 'System failed to compose learning schedule.')
        }
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#050508' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
            {/* Ambient Background Glows */}
            <View pointerEvents="none" style={styles.ambientGlowTop} />
            <View pointerEvents="none" style={styles.ambientGlowBottom} />

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {/* ── Category Chips Picker ── */}
                <FadeInView delay={0} style={styles.section}>
                    <Text style={styles.sectionLabel}>CHOOSE FOCUS FIELD</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalScroll}
                    >
                        {CATEGORIES.map((cat) => {
                            const isSelected = cat.id === selectedCategory
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    onPress={() => {
                                        triggerSelectionHaptic()
                                        setSelectedCategory(cat.id)
                                    }}
                                    style={[
                                        styles.categoryChip,
                                        isSelected && styles.categoryChipSelected
                                    ]}
                                >
                                    <Ionicons
                                        name={cat.icon as any}
                                        size={14}
                                        color={isSelected ? '#00F0FF' : '#5A6178'}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </ScrollView>
                </FadeInView>

                {/* ── Topic / Goal Title ── */}
                <FadeInView delay={100} style={styles.section}>
                    <Text style={styles.sectionLabel}>DEFINE STUDY TOPIC / GOAL</Text>
                    <GlassCard style={styles.inputContainer}>
                        <TextInput
                            value={title}
                            onChangeText={setTitle}
                            placeholder="e.g. Master React Native and Advanced Systems Design"
                            placeholderTextColor={C.placeholder}
                            style={styles.textInput}
                        />
                    </GlassCard>
                </FadeInView>

                {/* ── Duration ── */}
                <FadeInView delay={150} style={styles.section}>
                    <Text style={styles.sectionLabel}>PLAN DURATION (DAYS)</Text>
                    <View style={styles.durationRow}>
                        {DURATIONS.map((dur) => {
                            const isSelected = dur === selectedDuration
                            return (
                                <TouchableOpacity
                                    key={dur}
                                    onPress={() => {
                                        triggerSelectionHaptic()
                                        setSelectedDuration(dur)
                                    }}
                                    style={[
                                        styles.durationButton,
                                        isSelected && styles.durationButtonSelected
                                    ]}
                                >
                                    <Text style={[styles.durationText, isSelected && styles.durationTextActive]}>
                                        {dur}D
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </FadeInView>

                {/* ── Level ── */}
                <FadeInView delay={200} style={styles.section}>
                    <Text style={styles.sectionLabel}>CURRICULUM LEVEL</Text>
                    <SegmentedControl
                        segments={['BEGINNER', 'INTERMEDIATE', 'ADVANCED']}
                        selectedIndex={levelIndex}
                        onChange={setLevelIndex}
                    />
                </FadeInView>

                {/* ── Mission Intent ── */}
                <FadeInView delay={250} style={styles.section}>
                    <Text style={styles.sectionLabel}>MISSION INTENT Archetype</Text>
                    <View style={{ gap: 10 }}>
                        {INTENTS.map((intent) => {
                            const isSelected = intent.id === selectedIntent
                            return (
                                <GlassCard
                                    key={intent.id}
                                    onPress={() => {
                                        triggerSelectionHaptic()
                                        setSelectedIntent(intent.id)
                                    }}
                                    style={[
                                        styles.intentCard,
                                        isSelected && styles.intentCardSelected
                                    ]}
                                >
                                    <View style={styles.intentHeader}>
                                        <Text style={[styles.intentTitle, isSelected && styles.intentTextActive]}>
                                            {intent.label.toUpperCase()}
                                        </Text>
                                        {isSelected && <Ionicons name="checkmark-circle" size={16} color="#00F0FF" />}
                                    </View>
                                    <Text style={styles.intentDesc}>{intent.desc}</Text>
                                </GlassCard>
                            )
                        })}
                    </View>
                </FadeInView>

                {/* ── Commitment Budget ── */}
                <FadeInView delay={300} style={styles.section}>
                    <Text style={styles.sectionLabel}>DAILY STUDY BUDGET</Text>
                    <View style={styles.hoursRow}>
                        {[1, 2, 3, 4, 5, 6].map((hour) => {
                            const isSelected = hour === dailyHours
                            return (
                                <TouchableOpacity
                                    key={hour}
                                    onPress={() => {
                                        triggerSelectionHaptic()
                                        setDailyHours(hour)
                                    }}
                                    style={[
                                        styles.hourChip,
                                        isSelected && styles.hourChipSelected
                                    ]}
                                >
                                    <Text style={[styles.hourChipText, isSelected && styles.hourChipTextActive]}>
                                        {hour}H
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </FadeInView>

                {/* ── Generate Action Button ── */}
                <FadeInView delay={350} style={{ marginTop: 24, marginBottom: 40 }}>
                    <PremiumButton
                        title="GENERATE PERSONAL SYLLABUS"
                        onPress={handleCreate}
                        variant="primary"
                    />
                </FadeInView>
            </ScrollView>

            <PlanGeneratorLoader
                visible={isGenerating}
                error={generationError}
                onDismiss={() => {
                    setIsGenerating(false)
                    setGenerationError(null)
                }}
            />
        </KeyboardAvoidingView>
    )
}

const triggerSelectionHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
}

const styles = StyleSheet.create({
    scrollContent: {
        padding: 20,
        paddingBottom: 60,
        gap: 20
    },
    ambientGlowTop: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 320,
        height: 320,
        borderRadius: 160,
        backgroundColor: '#00F0FF',
        opacity: 0.04
    },
    ambientGlowBottom: {
        position: 'absolute',
        bottom: 120,
        left: -100,
        width: 320,
        height: 320,
        borderRadius: 160,
        backgroundColor: '#BD00FF',
        opacity: 0.04
    },
    section: {
        gap: 8
    },
    sectionLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: C.electricBlue,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        paddingLeft: 4
    },
    horizontalScroll: {
        paddingVertical: 4,
        gap: 8
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: BorderRadius.xxl
    },
    categoryChipSelected: {
        backgroundColor: 'rgba(0, 240, 255, 0.05)',
        borderColor: 'rgba(0, 240, 255, 0.25)',
        ...Shadows.glowSmall('#00F0FF', 0.15)
    },
    categoryText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#5A6178',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    categoryTextActive: {
        color: '#00F0FF'
    },
    inputContainer: {
        paddingHorizontal: 16,
        paddingVertical: 14
    },
    textInput: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 13,
        padding: 0
    },
    durationRow: {
        flexDirection: 'row',
        gap: 10
    },
    durationButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: BorderRadius.xl
    },
    durationButtonSelected: {
        backgroundColor: 'rgba(0, 240, 255, 0.05)',
        borderColor: 'rgba(0, 240, 255, 0.25)'
    },
    durationText: {
        fontSize: 12,
        fontWeight: '900',
        color: C.textDim,
        letterSpacing: 0.5
    },
    durationTextActive: {
        color: '#00F0FF'
    },
    intentCard: {
        padding: 16,
        borderWidth: 1,
        borderColor: 'transparent'
    },
    intentCardSelected: {
        backgroundColor: 'rgba(0, 240, 255, 0.02)',
        borderColor: 'rgba(0, 240, 255, 0.15)'
    },
    intentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    intentTitle: {
        fontSize: 11,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 1
    },
    intentTextActive: {
        color: '#00F0FF'
    },
    intentDesc: {
        fontSize: 9,
        color: C.textMuted,
        lineHeight: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    hoursRow: {
        flexDirection: 'row',
        gap: 8
    },
    hourChip: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: BorderRadius.xl
    },
    hourChipSelected: {
        backgroundColor: 'rgba(0, 240, 255, 0.05)',
        borderColor: 'rgba(0, 240, 255, 0.25)'
    },
    hourChipText: {
        fontSize: 12,
        fontWeight: '900',
        color: C.textDim,
        letterSpacing: 0.5
    },
    hourChipTextActive: {
        color: '#00F0FF'
    }
})
