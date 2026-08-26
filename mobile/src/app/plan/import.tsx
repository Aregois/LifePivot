import React, { useState, useCallback } from 'react'
import {
    View,
    Text,
    TextInput,
    ScrollView,
    TouchableOpacity,
    Alert,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { HapticsEngine } from '../../utils/HapticsEngine'
import { C, BorderRadius, Shadows } from '../../constants/theme'
import { apiRequest } from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'

// ── Types ─────────────────────────────────────────────────────────────────

interface ParsedTask {
    day: number
    title: string
    priority: number
    estimated_mins: number
    subject?: string
    subtasks?: string[]
    level?: string
    goal_intent?: string
    commitment_hours_per_week?: number
}

interface ValidationResult {
    valid: boolean
    tasks: ParsedTask[]
    errors: string[]
    warnings: string[]
    totalDays: number
    priorityBreakdown: Record<number, number>
}

// ── Helpers ───────────────────────────────────────────────────────────────

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
    0: { label: 'P0 Void', color: '#6B7280' },
    1: { label: 'P1 Light', color: '#10B981' },
    2: { label: 'P2 Theory', color: '#3B82F6' },
    3: { label: 'P3 Practice', color: '#F59E0B' },
    4: { label: 'P4 Hard App', color: '#F97316' },
    5: { label: 'P5 Deep', color: '#BD00FF' },
}

const VALID_SUBJECTS = new Set(['TECH', 'SCIENCE', 'MATH', 'HISTORY', 'ARTS', 'GENERAL'])

function validateJson(raw: string, t: (k: string, p?: any) => string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Strip markdown fences
    let cleaned = raw.trim()
    if (cleaned.startsWith('```')) {
        const lines = cleaned.split('\n')
        if (lines[0].startsWith('```')) lines.shift()
        if (lines[lines.length - 1].startsWith('```')) lines.pop()
        cleaned = lines.join('\n').trim()
    }

    let parsed: any
    try {
        parsed = JSON.parse(cleaned)
    } catch (e: any) {
        return {
            valid: false, tasks: [], errors: [t('plan_import.err_invalid_json')],
            warnings: [], totalDays: 0, priorityBreakdown: {}
        }
    }

    if (!Array.isArray(parsed)) {
        return {
            valid: false, tasks: [], errors: [t('plan_import.err_array')],
            warnings: [], totalDays: 0, priorityBreakdown: {}
        }
    }

    if (parsed.length < 5) {
        errors.push(t('plan_import.err_min_tasks', { count: parsed.length }))
        return { valid: false, tasks: [], errors, warnings, totalDays: 0, priorityBreakdown: {} }
    }

    const tasks: ParsedTask[] = []
    let subjectWarning = false

    for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i]
        const day = item.day ?? item.day_number

        if (day === undefined || day === null) {
            errors.push(`Missing required field: "day" on task at index ${i}`)
            continue
        }
        if (!item.title || typeof item.title !== 'string') {
            errors.push(`Task on day ${day} is missing a valid "title"`)
            continue
        }

        const priority = typeof item.priority === 'number'
            ? Math.max(0, Math.min(5, Math.floor(item.priority)))
            : 3

        const estimated_mins = typeof item.estimated_mins === 'number'
            ? item.estimated_mins
            : priority === 0 ? 90 : 60

        let subject = typeof item.subject === 'string' ? item.subject.toUpperCase() : 'GENERAL'
        if (!VALID_SUBJECTS.has(subject)) {
            if (!subjectWarning) {
                warnings.push(`Unknown subjects defaulted to "GENERAL"`)
                subjectWarning = true
            }
            subject = 'GENERAL'
        }

        const subtasks: string[] = Array.isArray(item.subtasks)
            ? item.subtasks.filter((s: any) => typeof s === 'string' && s.trim().length > 0)
            : []

        tasks.push({
            day: Number(day),
            title: String(item.title).trim(),
            priority,
            estimated_mins,
            subject,
            subtasks,
            level: item.level,
            goal_intent: item.goal_intent,
            commitment_hours_per_week: item.commitment_hours_per_week,
        })
    }

    if (errors.length > 0) {
        return { valid: false, tasks: [], errors, warnings, totalDays: 0, priorityBreakdown: {} }
    }

    const days = tasks.map(t => t.day)
    const minDay = Math.min(...days)
    const maxDay = Math.max(...days)
    const totalDays = maxDay

    if (minDay < 1) {
        errors.push('Days must start at 1, not 0')
    }

    const daySet = new Set(days)
    if (daySet.size < days.length) {
        warnings.push('Duplicate day numbers found — some days have multiple tasks')
    }

    const breakdown: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const t of tasks) {
        breakdown[t.priority] = (breakdown[t.priority] ?? 0) + 1
    }

    if ((breakdown[0] ?? 0) === 0 && totalDays >= 14) {
        warnings.push('No Void Days (P0) found — rest days help prevent burnout')
    }

    return {
        valid: errors.length === 0,
        tasks,
        errors,
        warnings,
        totalDays,
        priorityBreakdown: breakdown,
    }
}

// ── Main Screen ───────────────────────────────────────────────────────────

export default function ImportPlanScreen() {
    const router = useRouter()
    const { colors } = useTheme()
    const { t } = useLanguage()
    const [goalTitle, setGoalTitle] = useState('')
    const [rawJson, setRawJson] = useState('')
    const [validation, setValidation] = useState<ValidationResult | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    const handleValidate = useCallback(() => {
        HapticsEngine.tier1.light()
        setSaveError(null)
        const result = validateJson(rawJson, t)
        setValidation(result)
        if (result.valid) {
            HapticsEngine.tier3.success()
        } else {
            HapticsEngine.tier4.error()
        }
    }, [rawJson, t])

    const handleCreate = async () => {
        if (!validation?.valid || validation.tasks.length === 0) return

        const title = goalTitle.trim() || validation.tasks[0]?.title || 'Imported Study Plan'

        setIsSaving(true)
        setSaveError(null)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

        try {
            const firstTask = validation.tasks[0]
            const payload = {
                title,
                tasks: validation.tasks,
                duration_days: validation.totalDays,
                level: firstTask.level || 'Intermediate',
                goal_intent: firstTask.goal_intent || 'Level Up',
                commitment_hours_per_week: firstTask.commitment_hours_per_week || 10,
            }

            const res = await apiRequest<{ success: boolean; goalId: string; error?: string }>(
                '/api/plan/import-json',
                {
                    method: 'POST',
                    body: JSON.stringify(payload),
                }
            )

            if (!res.success || !res.goalId) {
                throw new Error(res.error || 'Failed to create plan')
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            Alert.alert(
                t('marketplace.success_title'),
                t('marketplace.success_cloned'),
                [
                    {
                        text: 'OK',
                        onPress: () => router.replace(`/plan/${res.goalId}` as any),
                    },
                ]
            )
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            setSaveError(err?.message || 'Failed to save plan. Please check your connection and try again.')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header ────────────────────────────────────────────────── */}
                <View style={styles.header}>
                    <View style={[styles.headerBadge, { borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}18` }]}>
                        <Ionicons name="sparkles" size={12} color={colors.primary} />
                        <Text style={[styles.headerBadgeText, { color: colors.primary }]}>{t('pro_curriculum.badge') || 'PRO FEATURE'}</Text>
                    </View>
                    <Text style={styles.headerTitle}>{t('plan_import.title') || 'Import JSON Plan'}</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        {t('plan_import.subtitle') || 'Paste structured JSON curriculum from Gemini Notebook or AI tutors'}
                    </Text>
                </View>

                {/* ── Plan Title input ──────────────────────────────────────── */}
                <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: colors.primary }]}>{t('creator.objective') || 'TOPIC / GOAL TITLE'}</Text>
                    <TextInput
                        value={goalTitle}
                        onChangeText={setGoalTitle}
                        placeholder="e.g. Quantum Computing — Qiskit & Algorithms"
                        placeholderTextColor={colors.placeholder}
                        style={[styles.titleInput, { backgroundColor: colors.card, borderColor: colors.glassBorder, color: colors.textPrimary }]}
                    />
                </View>

                {/* ── JSON textarea ─────────────────────────────────────────── */}
                <View style={styles.fieldGroup}>
                    <View style={styles.fieldLabelRow}>
                        <Text style={[styles.fieldLabel, { color: colors.primary }]}>{t('plan_import.paste_label') || 'PASTE YOUR JSON'}</Text>
                        {rawJson.length > 0 && (
                            <TouchableOpacity onPress={() => { setRawJson(''); setValidation(null) }}>
                                <Text style={[styles.clearBtn, { color: colors.textMuted }]}>{t('workspaces.cancel') || 'CLEAR'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <TextInput
                        value={rawJson}
                        onChangeText={(text) => {
                            setRawJson(text)
                            setValidation(null)
                        }}
                        placeholder={t('plan_import.paste_placeholder')}
                        placeholderTextColor={colors.placeholder}
                        multiline
                        numberOfLines={12}
                        textAlignVertical="top"
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                        style={[styles.jsonInput, { backgroundColor: colors.card, borderColor: colors.glassBorder, color: colors.textPrimary }]}
                    />
                    <Text style={[styles.charCount, { color: colors.textMuted }]}>
                        {rawJson.length > 0 ? `${rawJson.length} characters` : ''}
                    </Text>
                </View>

                {/* ── Validate button ───────────────────────────────────────── */}
                {rawJson.trim().length > 0 && (
                    <TouchableOpacity
                        onPress={handleValidate}
                        activeOpacity={0.85}
                        style={[styles.validateBtn, { borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}18` }]}
                    >
                        <Text style={[styles.validateBtnText, { color: colors.primary }]}>{t('plan_import.btn_validate') || 'VALIDATE JSON'}</Text>
                    </TouchableOpacity>
                )}

                {/* ── Validation: Errors ────────────────────────────────────── */}
                {validation && !validation.valid && (
                    <View style={styles.errorBox}>
                        <View style={styles.errorHeader}>
                            <Ionicons name="alert-circle" size={16} color="#F43F5E" />
                            <Text style={styles.errorHeaderText}>{t('common.error') || 'ERROR'}</Text>
                        </View>
                        {validation.errors.map((err, i) => (
                            <View key={i} style={styles.errorRow}>
                                <Text style={styles.errorBullet}>•</Text>
                                <Text style={styles.errorText}>{err}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Validation: Success preview ───────────────────────────── */}
                {validation?.valid && (
                    <View style={styles.previewSection}>
                        {/* Warnings */}
                        {validation.warnings.length > 0 && (
                            <View style={styles.warningBox}>
                                <View style={styles.warningHeader}>
                                    <Ionicons name="warning-outline" size={13} color="#F59E0B" />
                                    <Text style={styles.warningHeaderText}>{t('plan_import.warnings_title') || 'VALIDATION WARNINGS'}</Text>
                                </View>
                                {validation.warnings.map((w, i) => (
                                    <Text key={i} style={styles.warningText}>{w}</Text>
                                ))}
                            </View>
                        )}

                        {/* Summary card */}
                        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: `${colors.primary}33` }]}>
                            <View style={styles.summaryHeader}>
                                <Ionicons name="checkmark-circle" size={16} color={colors.emerald} />
                                <Text style={[styles.summaryHeaderText, { color: colors.emerald }]}>{t('plan_import.preview_title') || 'VALID CURRICULUM PREVIEW'}</Text>
                            </View>

                            {/* Stats */}
                            <View style={styles.statsRow}>
                                {[
                                    { label: t('plan_import.stat_days') || 'TOTAL DAYS', value: validation.totalDays, color: colors.primary },
                                    { label: t('plan_import.stat_tasks') || 'TOTAL TASKS', value: validation.tasks.length, color: colors.secondary },
                                    { label: t('plan_import.stat_rest') || 'REST DAYS', value: validation.priorityBreakdown[0] ?? 0, color: '#F59E0B' },
                                ].map(stat => (
                                    <View key={stat.label} style={[styles.statBox, { borderColor: colors.glassBorder }]}>
                                        <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Priority breakdown */}
                            <Text style={[styles.sectionMiniLabel, { color: colors.textMuted }]}>{t('plan_import.priority_breakdown') || 'PRIORITY BREAKDOWN'}</Text>
                            <View style={styles.priorityBreakdown}>
                                {[5, 4, 3, 2, 1, 0].map(p => {
                                    const count = validation.priorityBreakdown[p] ?? 0
                                    if (count === 0) return null
                                    const info = PRIORITY_LABELS[p]
                                    return (
                                        <View
                                            key={p}
                                            style={[
                                                styles.priorityBadge,
                                                { backgroundColor: `${info.color}15`, borderColor: `${info.color}30` }
                                            ]}
                                        >
                                            <Text style={[styles.priorityBadgeText, { color: info.color }]}>
                                                {info.label}: {count}
                                            </Text>
                                        </View>
                                    )
                                })}
                            </View>

                            {/* First 3 tasks */}
                            <Text style={[styles.sectionMiniLabel, { color: colors.textMuted }]}>{t('plan_import.first_tasks') || 'CURRICULUM PREVIEW'}</Text>
                            <View style={styles.taskPreviewList}>
                                {validation.tasks.slice(0, 3).map((taskItem, i) => {
                                    const info = PRIORITY_LABELS[taskItem.priority]
                                    return (
                                        <View key={i} style={[styles.taskPreviewItem, { borderColor: colors.glassBorder }]}>
                                            <View style={[styles.taskDayBadge, { backgroundColor: `${info.color}15` }]}>
                                                <Text style={[styles.taskDayText, { color: info.color }]}>D{taskItem.day}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.taskTitle, { color: colors.textPrimary }]} numberOfLines={2}>{taskItem.title}</Text>
                                                <Text style={[styles.taskMeta, { color: colors.textMuted }]}>
                                                    {info.label} · {taskItem.estimated_mins}min
                                                    {taskItem.subtasks && taskItem.subtasks.length > 0 ? ` · ${taskItem.subtasks.length} subtasks` : ''}
                                                </Text>
                                            </View>
                                        </View>
                                    )
                                })}
                            </View>
                        </View>
                    </View>
                )}

                {/* ── Save error ────────────────────────────────────────────── */}
                {saveError && (
                    <View style={styles.saveErrorBox}>
                        <Ionicons name="warning" size={14} color="#F43F5E" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.saveErrorText}>{saveError}</Text>
                            <TouchableOpacity onPress={handleCreate} style={styles.retryBtn}>
                                <Ionicons name="refresh" size={12} color="#F43F5E" />
                                <Text style={styles.retryText}>{t('plan_import.btn_retry') || 'RETRY'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── Create button ─────────────────────────────────────────── */}
                {validation?.valid && (
                    <TouchableOpacity
                        onPress={handleCreate}
                        disabled={isSaving}
                        activeOpacity={0.85}
                        style={[styles.createBtn, { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }, isSaving && { opacity: 0.6 }]}
                    >
                        {isSaving ? (
                            <>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={[styles.createBtnText, { color: colors.primary }]}>{t('plan_import.btn_creating') || 'IMPORTING...'}</Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                                <Text style={[styles.createBtnText, { color: colors.primary }]}>{t('plan_import.btn_create') || 'CREATE LEARNING PLAN'}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 80, gap: 16 },

    // Header
    header: { marginBottom: 4 },
    headerBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 999, backgroundColor: 'rgba(0, 240, 255, 0.1)',
        borderWidth: 1, borderColor: 'rgba(0, 240, 255, 0.2)',
        alignSelf: 'flex-start', marginBottom: 12,
    },
    headerBadgeText: {
        fontSize: 9, fontWeight: '900', color: C.electricBlue,
        letterSpacing: 2, textTransform: 'uppercase',
    },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginBottom: 6 },
    headerSubtitle: { fontSize: 13, color: '#9CA3AF', lineHeight: 19 },

    // Fields
    fieldGroup: { gap: 6 },
    fieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    fieldLabel: {
        fontSize: 9, fontWeight: '900', color: '#4B5563',
        letterSpacing: 2, textTransform: 'uppercase',
    },
    clearBtn: { fontSize: 11, color: '#6B7280' },
    titleInput: {
        paddingHorizontal: 16, paddingVertical: 12, borderRadius: BorderRadius.lg,
        backgroundColor: '#141824CC', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
        fontSize: 13, color: '#FFFFFF',
    },
    jsonInput: {
        paddingHorizontal: 14, paddingVertical: 12, borderRadius: BorderRadius.lg,
        backgroundColor: '#0a0c14', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
        fontSize: 10, color: '#D1D5DB', lineHeight: 16,
        minHeight: 280, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    charCount: { fontSize: 10, color: '#374151', textAlign: 'right' },

    // Validate
    validateBtn: {
        paddingVertical: 14, borderRadius: BorderRadius.xl,
        backgroundColor: 'rgba(0, 240, 255, 0.1)', borderWidth: 1,
        borderColor: 'rgba(0, 240, 255, 0.2)', alignItems: 'center', justifyContent: 'center',
    },
    validateBtnText: {
        fontSize: 11, fontWeight: '900', color: C.electricBlue,
        letterSpacing: 2, textTransform: 'uppercase',
    },

    // Error
    errorBox: {
        padding: 16, borderRadius: BorderRadius.lg,
        backgroundColor: 'rgba(244, 63, 94, 0.08)', borderWidth: 1,
        borderColor: 'rgba(244, 63, 94, 0.2)',
    },
    errorHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    errorHeaderText: { fontSize: 10, fontWeight: '900', color: '#F43F5E', letterSpacing: 1.5, textTransform: 'uppercase' },
    errorRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    errorBullet: { fontSize: 11, color: '#F43F5E', width: 14 },
    errorText: { fontSize: 12, color: 'rgba(244, 63, 94, 0.8)', flex: 1, lineHeight: 17 },

    // Preview
    previewSection: { gap: 12 },
    warningBox: {
        padding: 14, borderRadius: BorderRadius.lg,
        backgroundColor: 'rgba(245, 158, 11, 0.08)', borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    warningHeaderText: { fontSize: 10, fontWeight: '900', color: '#F59E0B', letterSpacing: 1.5, textTransform: 'uppercase' },
    warningText: { fontSize: 11, color: 'rgba(245, 158, 11, 0.7)', lineHeight: 16 },

    summaryCard: {
        padding: 18, borderRadius: BorderRadius.xl,
        backgroundColor: '#141824CC', borderWidth: 1,
        borderColor: 'rgba(0, 240, 255, 0.15)', ...Shadows.card,
    },
    summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    summaryHeaderText: { fontSize: 10, fontWeight: '900', color: C.electricBlue, letterSpacing: 2, textTransform: 'uppercase' },

    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    statBox: {
        flex: 1, padding: 12, borderRadius: BorderRadius.md,
        backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center',
    },
    statValue: { fontSize: 22, fontWeight: '900', marginBottom: 2 },
    statLabel: { fontSize: 8, fontWeight: '900', color: '#4B5563', letterSpacing: 1.5, textTransform: 'uppercase' },

    sectionMiniLabel: {
        fontSize: 9, fontWeight: '900', color: '#4B5563',
        letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8,
    },

    priorityBreakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
    priorityBadge: {
        paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: BorderRadius.md, borderWidth: 1,
    },
    priorityBadgeText: { fontSize: 10, fontWeight: '700' },

    taskPreviewList: { gap: 8 },
    taskPreviewItem: {
        flexDirection: 'row', gap: 10, alignItems: 'flex-start',
        paddingVertical: 10, paddingHorizontal: 12, borderRadius: BorderRadius.md,
        backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.04)',
    },
    taskDayBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
    taskDayText: { fontSize: 10, fontWeight: '900' },
    taskTitle: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', lineHeight: 17 },
    taskMeta: { fontSize: 10, color: '#4B5563', marginTop: 2 },

    // Save error
    saveErrorBox: {
        flexDirection: 'row', gap: 10, alignItems: 'flex-start',
        padding: 14, borderRadius: BorderRadius.lg,
        backgroundColor: 'rgba(244, 63, 94, 0.08)', borderWidth: 1,
        borderColor: 'rgba(244, 63, 94, 0.2)',
    },
    saveErrorText: { fontSize: 13, color: 'rgba(244, 63, 94, 0.85)', lineHeight: 18, flex: 1 },
    retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
    retryText: { fontSize: 10, fontWeight: '900', color: '#F43F5E', letterSpacing: 1.5, textTransform: 'uppercase' },

    // Create
    createBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 12, paddingVertical: 16, borderRadius: BorderRadius.xxl,
        backgroundColor: 'rgba(0, 240, 255, 0.1)', borderWidth: 1,
        borderColor: 'rgba(0, 240, 255, 0.25)', ...Shadows.elevated,
    },
    createBtnText: {
        fontSize: 13, fontWeight: '900', color: '#FFFFFF',
        letterSpacing: 1.5, textTransform: 'uppercase',
    },
})
