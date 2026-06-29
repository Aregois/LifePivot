import React, { useState, useEffect } from 'react'
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    Platform,
    Animated
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../utils/supabase'
import { C, Gradients, Shadows, BorderRadius } from '../../constants/theme'
import { FadeInView, GlassCard, PremiumButton, GradientText, GlowBadge } from '../../components/ui'
import { FileUploadSheet } from '../../components/FileUploadSheet'
import { TaskInteractionSheet } from '../../components/TaskInteractionSheet'

function FloatingXp({ value }: { value: number }) {
  const animValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [animValue]);

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [10, -45],
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  const scale = animValue.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.8, 1.2, 0.9],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 10,
        left: '45%',
        zIndex: 99,
        transform: [{ translateY }, { scale }],
        opacity,
      }}
    >
      <Text
        style={{
          color: '#00F0FF',
          fontWeight: '900',
          fontSize: 16,
          textShadowColor: 'rgba(0, 240, 255, 0.8)',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 8,
        }}
      >
        +{value} XP
      </Text>
    </Animated.View>
  );
}

interface Task {
    id: string
    title: string
    status: 'pending' | 'completed'
    priority: number
    duration_mins?: number
    subject?: string
    notes?: string
}

const TOKEN_REWARD: Record<number, number> = {
    0: 0,
    1: 1,
    2: 1,
    3: 1,
    4: 2,
    5: 3,
}

export default function PlanDetail() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const router = useRouter()
    
    const [goal, setGoal] = useState<any>(null)
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [materialsOpen, setMaterialsOpen] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const [selectedTask, setSelectedTask] = useState<any>(null)
    const [sheetVisible, setSheetVisible] = useState(false)
    const [animatingTaskId, setAnimatingTaskId] = useState<string | null>(null)
    const [animatingXpValue, setAnimatingXpValue] = useState<number>(0)

    const fetchPlanData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            setUserId(user.id)

            // Fetch goal
            const { data: goalData, error: goalError } = await supabase
                .from('learning_goals')
                .select('*')
                .eq('id', id)
                .single()

            if (goalError || !goalData) {
                Alert.alert('ERROR', 'Failed to retrieve plan details')
                return
            }
            setGoal(goalData)

            // Fetch tasks
            const { data: tasksData } = await supabase
                .from('tasks')
                .select('*')
                .eq('goal_id', id)
                .order('due_date', { ascending: true })

            setTasks(tasksData || [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPlanData()
    }, [id])

    const handleToggleTask = async (taskId: string, currentStatus: 'pending' | 'completed', priority: number) => {
        if (!userId) return

        if (currentStatus === 'pending') {
            const baseXp = priority && priority > 0 ? (priority * 10 + 10) : 0
            setAnimatingTaskId(taskId)
            setAnimatingXpValue(baseXp)
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            setTimeout(() => {
                setAnimatingTaskId(null)
            }, 900)
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }

        const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed'
        
        // Optimistic State Update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t))

        // Update task status in database
        const { error: taskError } = await supabase
            .from('tasks')
            .update({ status: nextStatus })
            .eq('id', taskId)

        if (taskError) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert('ERROR', 'Failed to update task')
            // Revert state
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: currentStatus } : t))
            return
        }

        // Handle XP and token rewards
        try {
            const { data: profile, error: profileErr } = await supabase
                .from('profiles')
                .select('xp, level, tokens_balance')
                .eq('id', userId)
                .single()

            if (!profileErr && profile) {
                const tokenDelta = TOKEN_REWARD[priority ?? 3] ?? 1
                const baseXp = priority && priority > 0 ? (priority * 10 + 10) : 0

                let newTokens = profile.tokens_balance
                let newXp = profile.xp
                let newLevel = profile.level

                if (nextStatus === 'completed') {
                    newTokens += tokenDelta
                    newXp += baseXp
                    const xpNeeded = newLevel * 1000
                    if (newXp >= xpNeeded) {
                        newXp -= xpNeeded
                        newLevel += 1
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                        Alert.alert('LEVEL UP!', `Congratulations! You reached Level ${newLevel}!`)
                    }
                } else {
                    newTokens = Math.max(0, newTokens - tokenDelta)
                    newXp = Math.max(0, newXp - baseXp)
                }

                await supabase
                    .from('profiles')
                    .update({
                        tokens_balance: newTokens,
                        xp: newXp,
                        level: newLevel
                    })
                    .eq('id', userId)
            }
        } catch (e) {
            console.error('Failed to sync profile metrics:', e)
        }
    }

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050508' }}>
                <ActivityIndicator size="large" color="#00F0FF" />
            </View>
        )
    }

    const completedCount = tasks.filter(t => t.status === 'completed').length
    const totalCount = tasks.length
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    return (
        <View style={{ flex: 1, backgroundColor: '#050508' }}>
            {/* Background Ambient Glows */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -100,
                right: -100,
                width: 320,
                height: 320,
                borderRadius: 160,
                backgroundColor: '#00F0FF',
                opacity: 0.05,
              }}
            />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                bottom: 120,
                left: -100,
                width: 320,
                height: 320,
                borderRadius: 160,
                backgroundColor: '#BD00FF',
                opacity: 0.05,
              }}
            />

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }} style={{ flex: 1 }}>
                
                {/* 1. HUD / Progress Card */}
                <FadeInView delay={0} style={{ marginBottom: 20 }}>
                    <GlassCard style={{ padding: 20, position: 'relative', overflow: 'hidden' }} elevated>
                        <LinearGradient
                            colors={['rgba(26, 31, 54, 0.2)', 'rgba(14, 17, 31, 0.4)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                        />
                        <View style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(0, 240, 255, 0.03)', transform: [{ scale: 1.5 }] }} />
                        <Text style={{ fontSize: 10, fontWeight: '900', letterSpacing: 3.5, color: C.electricBlue, textTransform: 'uppercase' }}>
                            SOLO CURRICULUM SHIELD
                        </Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
                            <GradientText style={{ fontSize: 20, fontWeight: '900', letterSpacing: 1 }}>
                                {goal.title}
                            </GradientText>
                        </View>
                        
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)', paddingTop: 16 }}>
                            <View>
                                <Text style={{ fontSize: 9, color: C.textSecondary, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2.5 }}>PLAN NODES</Text>
                                <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFFFFF', marginTop: 2 }}>
                                    {completedCount}/{totalCount} DONE
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 9, color: C.textSecondary, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2.5 }}>COMPLETION RATE</Text>
                                <Text style={{ fontSize: 14, fontWeight: '900', color: C.electricBlue, marginTop: 2 }}>
                                    {completionRate}%
                                </Text>
                            </View>
                        </View>
                    </GlassCard>
                </FadeInView>

                {/* 2. Study Materials Accordion */}
                <FadeInView delay={50} style={{ marginBottom: 20 }}>
                    <GlassCard style={{ padding: 18 }}>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                setMaterialsOpen(prev => !prev)
                            }}
                            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="attach" size={16} color={C.electricBlue} />
                                <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5, textTransform: 'uppercase' }}>
                                    STUDY MATERIALS SNIPPETS
                                </Text>
                            </View>
                            <Ionicons name={materialsOpen ? "chevron-up" : "chevron-down"} size={16} color={C.textDim} />
                        </TouchableOpacity>

                        {materialsOpen && (
                            <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)', paddingTop: 16 }}>
                                <FileUploadSheet planId={id} />
                            </View>
                        )}
                    </GlassCard>
                </FadeInView>

                {/* 3. Task Checklist list */}
                <Text style={{ fontSize: 10, color: C.electricBlue, fontWeight: '900', letterSpacing: 3.5, textTransform: 'uppercase', marginBottom: 12, paddingLeft: 4 }}>
                    CURRICULUM CHECKLIST
                </Text>

                <View style={{ gap: 10 }}>
                    {tasks.length === 0 ? (
                        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                            <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                                NO TASKS IN THIS LEARNING PATH
                            </Text>
                        </View>
                    ) : (
                        tasks.map((task) => (
                            <GlassCard
                                key={task.id}
                                style={{
                                    padding: 16,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 12,
                                    borderColor: task.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : C.glassBorder
                                }}
                            >
                                <TouchableOpacity
                                    onPress={() => handleToggleTask(task.id, task.status, task.priority)}
                                    style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: 6,
                                        borderWidth: 2,
                                        borderColor: task.status === 'completed' ? '#10B981' : 'rgba(255,255,255,0.2)',
                                        backgroundColor: task.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {task.status === 'completed' && (
                                        <Ionicons name="checkmark" size={14} color="#10B981" />
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={{ flex: 1 }}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                        setSelectedTask(task)
                                        setSheetVisible(true)
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: '800',
                                            color: task.status === 'completed' ? C.textMuted : '#FFFFFF',
                                            textDecorationLine: task.status === 'completed' ? 'line-through' : 'none'
                                        }}
                                    >
                                        {task.title}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                        {task.subject && (
                                            <GlowBadge label={task.subject} colorScheme="violet" />
                                        )}
                                        {task.duration_mins && (
                                            <Text style={{ fontSize: 9, color: C.textSecondary, fontWeight: '700' }}>
                                                ⏳ {task.duration_mins} MINS
                                            </Text>
                                        )}
                                    </View>
                                    {task.notes && task.status !== 'completed' && (
                                        <Text style={{ fontSize: 10, color: C.textSecondary, marginTop: 4, lineHeight: 14 }}>
                                            {task.notes}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                                {animatingTaskId === task.id && (
                                    <FloatingXp value={animatingXpValue} />
                                )}
                            </GlassCard>
                        ))
                    )}
                </View>
            </ScrollView>
            <TaskInteractionSheet
                task={selectedTask}
                visible={sheetVisible}
                onClose={() => setSheetVisible(false)}
            />
        </View>
    )
}
