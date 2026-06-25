import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../utils/api'

export interface PublicPlan {
    id: string
    title: string
    duration_days: number
    level: string
    goal_intent: string
    commitment_hours_per_week: number
    is_public: boolean
    rating: number
    created_at: string
    plan_metadata?: {
        token_cost?: number
        imported_from?: string
    }
    profiles?: {
        id: string
        role: string
        linkedin_url?: string
    }
}

// 1. Hook to fetch public marketplace plans
export function useDiscoverPlans(sortBy: 'created_at' | 'rating' = 'created_at', order: 'asc' | 'desc' = 'desc') {
    return useQuery<{ plans: PublicPlan[] }>({
        queryKey: ['discover-plans', sortBy, order],
        queryFn: () => apiRequest(`/api/plans/discover?sortBy=${sortBy}&order=${order}`)
    })
}

// 2. Hook to publish a plan to the marketplace
export function usePublishPlan() {
    const queryClient = useQueryClient()
    return useMutation<any, Error, { goalId: string; isPublic: boolean; tokenCost: number }>({
        mutationFn: (payload) => apiRequest('/api/plans/publish', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['discover-plans'] })
            queryClient.invalidateQueries({ queryKey: ['my-plans'] }) // Invalidate user plans to sync states
        }
    })
}

// 3. Hook to import/purchase a plan
export function useImportPlan() {
    const queryClient = useQueryClient()
    return useMutation<any, Error, string>({
        mutationFn: (goalId) => apiRequest('/api/plans/import', {
            method: 'POST',
            body: JSON.stringify({ goalId })
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-plans'] })
            queryClient.invalidateQueries({ queryKey: ['profile'] }) // Update token balance on HUD if premium
        }
    })
}

// 4. Hook to rate a plan
export function useRatePlan() {
    const queryClient = useQueryClient()
    return useMutation<any, Error, { goalId: string; rating: number }>({
        mutationFn: ({ goalId, rating }) => apiRequest(`/api/plans/${goalId}/rate`, {
            method: 'POST',
            body: JSON.stringify({ rating })
        }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['discover-plans'] })
        }
    })
}
