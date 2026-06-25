import React, { useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { useWorkspaceStudents, usePushTutorTask, useLeaveWorkspace, WorkspaceStudent } from '../../hooks/useWorkspaces'
import { supabase } from '../../utils/supabase'
import { C, Gradients, Shadows, BorderRadius } from '../../constants/theme'
import { FadeInView, GlassCard, SegmentedControl, AvatarMonogram, PremiumButton, GradientText, GlowBadge } from '../../components/ui'
import { FileUploadSheet } from '../../components/FileUploadSheet'

export default function WorkspaceDetail() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const router = useRouter()
    const { data: students, isLoading, refetch } = useWorkspaceStudents(id)
    const { mutate: pushTask, isPending: isPushing } = usePushTutorTask()
    const { mutate: leaveWS } = useLeaveWorkspace()

    const [activeSegmentIndex, setActiveSegmentIndex] = useState(0) // 0: feed, 1: members
    const [userRole, setUserRole] = useState<'student' | 'tutor'>('student')
    const [selectedStudent, setSelectedStudent] = useState<WorkspaceStudent | null>(null)
    const [studentRoster, setStudentRoster] = useState<WorkspaceStudent[]>([])

    // Task Form States
    const [taskTitle, setTaskTitle] = useState('')
    const [taskSubject, setTaskSubject] = useState('')
    const [taskDuration, setTaskDuration] = useState('30')
    const [taskNotes, setTaskNotes] = useState('')
    
    const [titleFocused, setTitleFocused] = useState(false)
    const [subjectFocused, setSubjectFocused] = useState(false)
    const [durationFocused, setDurationFocused] = useState(false)
    const [notesFocused, setNotesFocused] = useState(false)

    React.useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()
                    .then(({ data: profile }) => {
                        if (profile) {
                            const role = profile.role as 'student' | 'tutor'
                            setUserRole(role)
                            if (role === 'student') {
                                supabase
                                    .from('workspace_members')
                                    .select('user_id, profiles(username, xp)')
                                    .eq('workspace_id', id)
                                    .then(({ data: members, error }) => {
                                        if (members && !error) {
                                            const roster: WorkspaceStudent[] = members.map((m: any) => ({
                                                id: m.user_id,
                                                username: m.profiles?.username || 'Unknown Student',
                                                xp: m.profiles?.xp || 0,
                                                level: Math.floor((m.profiles?.xp || 0) / 100) + 1,
                                                currentStreak: 0,
                                                highStreak: 0,
                                                tokens: 0,
                                                joinedAt: new Date().toISOString(),
                                                totalTasks: 0,
                                                completedTasks: 0,
                                                completionRate: 0
                                            }))
                                            setStudentRoster(roster)
                                        }
                                    })
                            }
                        }
                    })
            }
        })
    }, [id])

    const handleLeave = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        Alert.alert(
            'LEAVE COHORT',
            'Are you sure you want to leave this study cohort?',
            [
                { text: 'CANCEL', style: 'cancel' },
                {
                    text: 'LEAVE',
                    style: 'destructive',
                    onPress: () => {
                        leaveWS(id, {
                            onSuccess: () => {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                                router.replace('/workspaces')
                            },
                            onError: () => {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                            }
                        })
                    }
                }
            ]
        )
    }

    const handlePushTask = () => {
        if (!selectedStudent) return
        const trimmedTitle = taskTitle.trim()
        if (!trimmedTitle) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert('ERROR', 'Task title is required')
            return
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        pushTask(
            {
                studentId: selectedStudent.id,
                workspaceId: id,
                task: {
                    title: trimmedTitle,
                    subject: taskSubject.trim() || 'General Study',
                    duration_mins: Number(taskDuration || 30),
                    notes: taskNotes.trim() || 'Assigned by cohort tutor.'
                }
            },
            {
                onSuccess: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                    Alert.alert('SUCCESS', `Task pushed to student successfully!`)
                    setSelectedStudent(null)
                    setTaskTitle('')
                    setTaskSubject('')
                    setTaskDuration('30')
                    setTaskNotes('')
                    refetch()
                },
                onError: (err) => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                    Alert.alert('ERROR', err.message || 'Failed to inject task')
                }
            }
        )
    }

    const displayedStudents = userRole === 'tutor' ? (students || []) : studentRoster

    // Mock Focus Feed data based on student metrics
    const feedItems = displayedStudents.flatMap(student => {
        if (student.completedTasks === 0) return []
        return [
            {
                id: `${student.id}-feed-1`,
                username: student.username,
                action: 'completed P5 theory concepts',
                time: '10m ago'
            },
            {
                id: `${student.id}-feed-2`,
                username: student.username,
                action: `maintained a ${student.currentStreak} day study streak!`,
                time: '1h ago'
            }
        ]
    })

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#050508]">
                <ActivityIndicator size="large" color="#00F0FF" />
            </View>
        )
    }

    const totalXp = displayedStudents.reduce((acc, s) => acc + s.xp, 0) || 0
    const avgCompletion = displayedStudents.length > 0
        ? Math.round(displayedStudents.reduce((acc, s) => acc + s.completionRate, 0) / displayedStudents.length)
        : 0

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: '#050508' }}
        >
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }} style={{ flex: 1 }}>
                {/* 1. Shared HUD Card */}
                <FadeInView delay={0} style={{ marginBottom: 20 }}>
                    <GlassCard style={{ padding: 20, position: 'relative', overflow: 'hidden' }} elevated>
                        <LinearGradient
                            colors={['rgba(26, 31, 54, 0.2)', 'rgba(14, 17, 31, 0.4)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                        />
                        <View style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(0, 240, 255, 0.03)', transform: [{ scale: 1.5 }] }} />
                        <Text style={{ fontSize: 10, fontWeight: '900', letterSpacing: 2, color: C.electricBlue, textTransform: 'uppercase' }}>
                            COHORT PROGRESS SHIELD
                        </Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
                            <GradientText style={{ fontSize: 22, fontWeight: '900', letterSpacing: 1 }}>
                                GROUP SYNERGY
                            </GradientText>
                            <GlowBadge label={`${displayedStudents.length} MEMBERS`} colorScheme="violet" />
                        </View>
                        
                        {/* Aggregated progress stats */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)', paddingTop: 16 }}>
                            <View>
                                <Text style={{ fontSize: 9, color: C.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>AGGREGATE XP</Text>
                                <Text style={{ fontSize: 15, fontWeight: '900', color: '#FFFFFF', marginTop: 2 }}>
                                    {totalXp} XP
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 9, color: C.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>COMPLETION RATE</Text>
                                <Text style={{ fontSize: 15, fontWeight: '900', color: C.electricBlue, marginTop: 2 }}>
                                    {avgCompletion}% DONE
                                </Text>
                            </View>
                        </View>
                    </GlassCard>
                </FadeInView>

                {/* 2. Custom Segments Toggle */}
                <FadeInView delay={50} style={{ marginBottom: 20 }}>
                    <SegmentedControl
                        segments={['FOCUS FEED', 'MEMBERS', 'MATERIALS']}
                        selectedIndex={activeSegmentIndex}
                        onChange={setActiveSegmentIndex}
                    />
                </FadeInView>

                {/* Segment Content */}
                {activeSegmentIndex === 0 && (
                    <View style={{ gap: 10 }}>
                        {feedItems.length === 0 ? (
                            <FadeInView delay={100} style={{ paddingVertical: 48, alignItems: 'center' }}>
                                <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                                    FEED PENDING RECENT STUDY ACTIVITIES
                                </Text>
                            </FadeInView>
                        ) : (
                            feedItems.map((item, idx) => (
                                <FadeInView key={item.id} delay={100 + idx * 50}>
                                    <GlassCard style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                                            <AvatarMonogram name={item.username} size={32} />
                                            <View style={{ marginLeft: 12, flex: 1 }}>
                                                <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '800' }}>{item.username}</Text>
                                                <Text style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{item.action}</Text>
                                            </View>
                                        </View>
                                        <Text style={{ fontSize: 9, fontWeight: '900', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>{item.time}</Text>
                                    </GlassCard>
                                </FadeInView>
                            ))
                        )}
                    </View>
                )}

                {activeSegmentIndex === 1 && (
                    <View style={{ gap: 12 }}>
                        {displayedStudents.map((student, idx) => (
                            <FadeInView key={student.id} delay={100 + idx * 50}>
                                <GlassCard style={{ padding: 18 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <AvatarMonogram name={student.username} size={36} />
                                            <View style={{ marginLeft: 12 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 }}>{student.username}</Text>
                                                <Text style={{ fontSize: 9, color: C.textDim, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                                                    LVL {student.level} | {student.currentStreak} DAY STREAK
                                                </Text>
                                            </View>
                                        </View>
                                        <GlowBadge label={`${student.completionRate}% DONE`} colorScheme={student.completionRate === 100 ? 'emerald' : 'blue'} />
                                    </View>

                                    {/* Tutor Push Task Button */}
                                    {userRole === 'tutor' && (
                                        <PremiumButton
                                            title="INJECT STUDY TASK"
                                            onPress={() => setSelectedStudent(student)}
                                            variant="ghost"
                                            style={{ minHeight: 38, marginTop: 4 }}
                                        />
                                    )}
                                </GlassCard>
                            </FadeInView>
                        ))}
                    </View>
                )}

                {activeSegmentIndex === 2 && (
                    <FadeInView delay={100}>
                        <GlassCard style={{ padding: 18 }}>
                            <FileUploadSheet workspaceId={id} />
                        </GlassCard>
                    </FadeInView>
                )}

                {/* Leave Cohort Button */}
                {userRole === 'student' && (
                    <FadeInView delay={200}>
                        <PremiumButton
                            title="LEAVE STUDY COHORT"
                            onPress={handleLeave}
                            variant="destructive"
                            style={{ marginTop: 24 }}
                        />
                    </FadeInView>
                )}
            </ScrollView>

            {/* Tutor Push Task Form Sheet/Modal Overlay */}
            {selectedStudent && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end', zIndex: 999 }}>
                    <GlassCard padded={false} style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopWidth: 1, borderTopColor: C.glassBorderSubtle, padding: 24, ...Shadows.elevated }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1, textTransform: 'uppercase' }}>
                                INJECT TASK: {selectedStudent.username}
                            </Text>
                            <TouchableOpacity onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                setSelectedStudent(null)
                            }}>
                                <Text style={{ color: C.textDim, fontWeight: '800', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>CANCEL</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: Platform.OS === 'ios' ? 420 : 320 }}>
                            <Text style={{ fontSize: 9, color: C.textDim, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>TASK TITLE</Text>
                            <TextInput
                                value={taskTitle}
                                onChangeText={setTaskTitle}
                                placeholder="e.g. Solve Linear Equations"
                                placeholderTextColor={C.placeholder}
                                onFocus={() => setTitleFocused(true)}
                                onBlur={() => setTitleFocused(false)}
                                style={{
                                    backgroundColor: 'rgba(5, 5, 8, 0.6)',
                                    borderWidth: 1,
                                    borderColor: titleFocused ? C.electricBlue : C.glassBorder,
                                    borderRadius: 12,
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    color: '#FFFFFF',
                                    fontWeight: '600',
                                    fontSize: 12,
                                    marginBottom: 14,
                                }}
                            />

                            <Text style={{ fontSize: 9, color: C.textDim, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>SUBJECT</Text>
                            <TextInput
                                value={taskSubject}
                                onChangeText={setTaskSubject}
                                placeholder="e.g. Algebra II"
                                placeholderTextColor={C.placeholder}
                                onFocus={() => setSubjectFocused(true)}
                                onBlur={() => setSubjectFocused(false)}
                                style={{
                                    backgroundColor: 'rgba(5, 5, 8, 0.6)',
                                    borderWidth: 1,
                                    borderColor: subjectFocused ? C.electricBlue : C.glassBorder,
                                    borderRadius: 12,
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    color: '#FFFFFF',
                                    fontWeight: '600',
                                    fontSize: 12,
                                    marginBottom: 14,
                                }}
                            />

                            <Text style={{ fontSize: 9, color: C.textDim, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>DURATION (MINS)</Text>
                            <TextInput
                                value={taskDuration}
                                onChangeText={setTaskDuration}
                                keyboardType="numeric"
                                onFocus={() => setDurationFocused(true)}
                                onBlur={() => setDurationFocused(false)}
                                style={{
                                    backgroundColor: 'rgba(5, 5, 8, 0.6)',
                                    borderWidth: 1,
                                    borderColor: durationFocused ? C.electricBlue : C.glassBorder,
                                    borderRadius: 12,
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    color: '#FFFFFF',
                                    fontWeight: '600',
                                    fontSize: 12,
                                    marginBottom: 14,
                                }}
                            />

                            <Text style={{ fontSize: 9, color: C.textDim, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>ADDITIONAL NOTES</Text>
                            <TextInput
                                value={taskNotes}
                                onChangeText={setTaskNotes}
                                multiline
                                numberOfLines={3}
                                placeholder="Provide tutor guidelines or tips..."
                                placeholderTextColor={C.placeholder}
                                onFocus={() => setNotesFocused(true)}
                                onBlur={() => setNotesFocused(false)}
                                style={{
                                    backgroundColor: 'rgba(5, 5, 8, 0.6)',
                                    borderWidth: 1,
                                    borderColor: notesFocused ? C.electricBlue : C.glassBorder,
                                    borderRadius: 12,
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    color: '#FFFFFF',
                                    fontWeight: '600',
                                    fontSize: 12,
                                    marginBottom: 20,
                                    textAlignVertical: 'top',
                                }}
                            />
                        </ScrollView>

                        <PremiumButton
                            title="INJECT STUDY PLAN NODE"
                            onPress={handlePushTask}
                            variant="primary"
                            loading={isPushing}
                            disabled={isPushing}
                        />
                    </GlassCard>
                </View>
            )}
        </KeyboardAvoidingView>
    )
}
