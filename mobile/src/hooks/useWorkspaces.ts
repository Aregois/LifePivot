import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../utils/api'
import { supabase } from '../utils/supabase'

export interface Workspace {
    id: string
    name: string
    creator_id: string
    is_premium: boolean
    token_cost: number
    created_at: string
    isJoined?: boolean
    isCreator?: boolean
}

export interface WorkspaceStudent {
    id: string
    username: string
    xp: number
    level: number
    currentStreak: number
    highStreak: number
    tokens: number
    joinedAt: string
    totalTasks: number
    completedTasks: number
    completionRate: number
}

// 1. Hook to fetch all workspaces (joined & discoverable)
export function useWorkspaces() {
    return useQuery<{ workspaces: Workspace[] }>({
        queryKey: ['workspaces'],
        queryFn: () => apiRequest('/api/workspaces')
    })
}

// 2. Hook to create a workspace (tutors only)
export function useCreateWorkspace() {
    const queryClient = useQueryClient()
    return useMutation<any, Error, { name: string; isPremium: boolean; tokenCost: number }>({
        mutationFn: (newWS) => apiRequest('/api/workspaces', {
            method: 'POST',
            body: JSON.stringify(newWS)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspaces'] })
        }
    })
}

// 3. Hook to join a workspace (premium handles token deduction automatically)
export function useJoinWorkspace() {
    const queryClient = useQueryClient()
    return useMutation<any, Error, string>({
        mutationFn: (workspaceId) => apiRequest('/api/workspaces/join', {
            method: 'POST',
            body: JSON.stringify({ workspaceId })
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspaces'] })
            queryClient.invalidateQueries({ queryKey: ['profile'] }) // Update token balance on HUD
        }
    })
}

// 4. Hook to leave a workspace
export function useLeaveWorkspace() {
    const queryClient = useQueryClient()
    return useMutation<any, Error, string>({
        mutationFn: (workspaceId) => apiRequest('/api/workspaces/leave', {
            method: 'POST',
            body: JSON.stringify({ workspaceId })
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspaces'] })
        }
    })
}

// 5. Hook for tutors to fetch student cohort details
export function useWorkspaceStudents(workspaceId: string) {
    return useQuery<WorkspaceStudent[]>({
        queryKey: ['workspace-students', workspaceId],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return []

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role !== 'tutor') {
                return []
            }

            const data = await apiRequest<{ students: WorkspaceStudent[] }>(`/api/workspaces/${workspaceId}/students`)
            return data.students
        },
        enabled: !!workspaceId
    })
}

// 6. Hook for tutors to push tasks to students
export function usePushTutorTask() {
    const queryClient = useQueryClient()
    return useMutation<any, Error, { studentId: string; workspaceId: string; task: any }>({
        mutationFn: (payload) => apiRequest('/api/tasks/push-tutor-task', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['workspace-students', variables.workspaceId] })
        }
    })
}
