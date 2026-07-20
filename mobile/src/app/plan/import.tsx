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
import { C, BorderRadius, Shadows } from '../../constants/theme'
import { apiRequest } from '../../utils/api'

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

function validateJson(raw: string): ValidationResult {
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
            valid: false, tasks: [], errors: ['Invalid JSON — check for missing commas or brackets.'],
            warnings: [], totalDays: 0, priorityBreakdown: {}
        }
    }

    if (!Array.isArray(parsed)) {
        return {
            valid: false, tasks: [], errors: ['Must be a JSON array. Wrap tasks in [ ... ]'],
            warnings: [], totalDays: 0, priorityBreakdown: {}
        }
    }

    if (parsed.length < 5) {
        errors.push(`Plan must have at least 5 tasks. Found ${parsed.length}.`)
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
        if (!item.title) {
            errors.push(`Missing required field: "title" on day ${day}`)
            continue
        }
        if (item.priority === undefined || item.priority === null) {
            errors.push(`Missing required field: "priority" on day ${day}`)
            continue
        }
        if (typeof item.priority !== 'number' || item.priority < 0 || item.priority > 5) {
            errors.push(`Priority ${item.priority} on day ${day} is not valid (must be 0–5)`)
            continue
        }
        if (item.estimated_mins === undefined || item.estimated_mins === null) {
            errors.push(`Missing required field: "estimated_mins" on day ${day}`)
            continue
        }
        if (item.subject && !VALID_SUBJECTS.has(String(item.subject).toUpperCase())) {
            subjectWarning = true
        }

        tasks.push({
            day,
            title: item.title,
            priority: item.priority,
            estimated_mins: item.estimated_mins,
            subject: item.subject,
            subtasks: Array.isArray(item.subtasks) ? item.subtasks : [],
            level: item.level,
            goal_intent: item.goal_intent,
            commitment_hours_per_week: item.commitment_hours_per_week,
        })
    }

    if (errors.length > 0) {
        return { valid: false, tasks, errors, warnings, totalDays: 0, priorityBreakdown: {} }
    }

    const hasVoidDays = tasks.some(t => t.priority === 0)
    if (!hasVoidDays) warnings.push('No Void Days found — a balanced plan usually includes rest days.')
    if (subjectWarning) warnings.push('Some tasks had unknown subject values — set to GENERAL automatically.')

    const totalDays = Math.max(...tasks.map(t => t.day))
    const priorityBreakdown: Record<number, number> = {}
    for (const t of tasks) {
        priorityBreakdown[t.priority] = (priorityBreakdown[t.priority] || 0) + 1
    }

    return { valid: true, tasks, errors, warnings, totalDays, priorityBreakdown }
}

// ── Main component ────────────────────────────────────────────────────────

export default function ImportPlanScreen() {
    const router = useRouter()
    const [raw, setRaw] = useState('')
    const [planTitle, setPlanTitle] = useState('')
    const [validation, setValidation] = useState<ValidationResult | null>(null)
    const [isValidating, setIsValidating] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    const handleValidate = useCallback(() => {
        if (!raw.trim()) return
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        setIsValidating(true)
        setTimeout(() => {
            const result = validateJson(raw)
            setValidation(result)
            setIsValidating(false)
        }, 300)
    }, [raw])

    const handleCreate = async () => {
        if (!validation?.valid) return
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        setIsSaving(true)
        setSaveError(null)

        try {
            await apiRequest('/api/plans/json-import', {
                method: 'POST',
                body: JSON.stringify({
                    tasks: validation.tasks,
                    planTitle: planTitle.trim() || undefined,
                }),
            })
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            router.replace('/(tabs)/plan')
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            if (err.message?.includes('SUBSCRIBE_REQUIRED')) {
                setSaveError('This is a Pro feature. Upgrade to import unlimited plans.')
            } else {
                setSaveError(err.message || 'Something went wrong. Please try again.')
            }
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header ──────────────────────────────────────────────── */}
                <View style={styles.header}>
                    <View style={styles.headerBadge}>
                        <Ionicons name="cloud-upload-outline" size={12} color={C.electricBlue} />
                        <Text style={styles.headerBadgeText}>JSON IMPORT</Text>
                    </View>
                    <Text style={styles.headerTitle}>Import Plan from JSON</Text>
                    <Text style={styles.headerSubtitle}>
                        Paste the JSON generated by Gemini Notebook to create your personalized plan.
                    </Text>
                </View>

                {/* ── Plan title ───────────────────────────────────────────── */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>PLAN TITLE (OPTIONAL)</Text>
                    <TextInput
                        value={planTitle}
                        onChangeText={setPlanTitle}
                        placeholder="e.g. Quantum Mechanics — 20 Day Exam Plan"
                        placeholderTextColor="#374151"
                        style={styles.titleInput}
                    />
                </View>

                {/* ── JSON textarea ─────────────────────────────────────────── */}
                <View style={styles.fieldGroup}>
                    <View style={styles.fieldLabelRow}>
                        <Text style={styles.fieldLabel}>JSON PLAN</Text>
                        {raw.length > 0 && (
                            <TouchableOpacity onPress={() => { setRaw(''); setValidation(null); setSaveError(null) }}>
                                <Text style={styles.clearBtn}>Clear</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <TextInput
                        value={raw}
                        onChangeText={t => {
                            setRaw(t)
                            setValidation(null)
                            setSaveError(null)
                        }}
                        placeholder="Paste your JSON plan here..."
                        placeholderTextColor="#374151"
                        multiline
                        scrollEnabled
                        style={styles.jsonInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                        textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>{raw.length.toLocaleString()} characters</Text>
                </View>

                {/* ── Validate button ───────────────────────────────────────── */}
                <TouchableOpacity
                    onPress={handleValidate}
                    disabled={!raw.trim() || isValidating}
                    activeOpacity={0.8}
                    style={[styles.validateBtn, (!raw.trim() || isValidating) && { opacity: 0.4 }]}
                >
                    {isValidating ? (
                        <ActivityIndicator size="small" color={C.electricBlue} />
                    ) : (
                        <Text style={styles.validateBtnText}>VALIDATE & PREVIEW</Text>
                    )}
                </TouchableOpacity>

                {/* ── Validation errors ─────────────────────────────────────── */}
                {validation && !validation.valid && (
                    <View style={styles.errorBox}>
                        <View style={styles.errorHeader}>
                            <Ionicons name="warning" size={14} color="#F43F5E" />
                            <Text style={styles.errorHeaderText}>VALIDATION FAILED</Text>
                        </View>
                        {validation.errors.map((err, i) => (
                            <View key={i} style={styles.errorRow}>
                                <Text style={styles.errorBullet}>✕</Text>
                                <Text style={styles.errorText}>{err}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Preview ───────────────────────────────────────────────── */}
                {validation?.valid && (
                    <View style={styles.previewSection}>
                        {/* Warnings */}
                        {validation.warnings.length > 0 && (
                            <View style={styles.warningBox}>
                                <View style={styles.warningHeader}>
                                    <Ionicons name="warning-outline" size={13} color="#F59E0B" />
                                    <Text style={styles.warningHeaderText}>WARNINGS</Text>
                                </View>
                                {validation.warnings.map((w, i) => (
                                    <Text key={i} style={styles.warningText}>{w}</Text>
                                ))}
                            </View>
                        )}

                        {/* Summary card */}
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryHeader}>
                                <Ionicons name="checkmark-circle" size={16} color={C.electricBlue} />
                                <Text style={styles.summaryHeaderText}>PLAN PREVIEW</Text>
                            </View>

                            {/* Stats */}
                            <View style={styles.statsRow}>
                                {[
                                    { label: 'DAYS', value: validation.totalDays, color: C.electricBlue },
                                    { label: 'TASKS', value: validation.tasks.length, color: C.neonViolet },
                                    { label: 'REST DAYS', value: validation.priorityBreakdown[0] ?? 0, color: '#F59E0B' },
                                ].map(stat => (
                                    <View key={stat.label} style={styles.statBox}>
                                        <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                                        <Text style={styles.statLabel}>{stat.label}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Priority breakdown */}
                            <Text style={styles.sectionMiniLabel}>PRIORITY BREAKDOWN</Text>
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
                            <Text style={styles.sectionMiniLabel}>FIRST 3 TASKS</Text>
                            <View style={styles.taskPreviewList}>
                                {validation.tasks.slice(0, 3).map((t, i) => {
                                    const info = PRIORITY_LABELS[t.priority]
                                    return (
                                        <View key={i} style={styles.taskPreviewItem}>
                                            <View style={[styles.taskDayBadge, { backgroundColor: `${info.color}15` }]}>
                                                <Text style={[styles.taskDayText, { color: info.color }]}>D{t.day}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.taskTitle} numberOfLines={2}>{t.title}</Text>
                                                <Text style={styles.taskMeta}>
                                                    {info.label} · {t.estimated_mins}min
                                                    {t.subtasks && t.subtasks.length > 0 ? ` · ${t.subtasks.length} subtasks` : ''}
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
                                <Text style={styles.retryText}>RETRY</Text>
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
                        style={[styles.createBtn, isSaving && { opacity: 0.6 }]}
                    >
                        {isSaving ? (
                            <>
                                <ActivityIndicator size="small" color={C.electricBlue} />
                                <Text style={styles.createBtnText}>CREATING YOUR PLAN…</Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="cloud-upload-outline" size={18} color={C.electricBlue} />
                                <Text style={styles.createBtnText}>CREATE THIS PLAN</Text>
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
    container: { flex: 1, backgroundColor: '#050508' },
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
