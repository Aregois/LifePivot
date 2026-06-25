import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../utils/api'

export function useSubscribe() {
    const queryClient = useQueryClient()
    return useMutation<any, Error, { mockSuccess: boolean; transactionId?: string }>({
        mutationFn: (payload) => apiRequest('/api/profile/subscribe', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] })
            queryClient.invalidateQueries({ queryKey: ['user-subscription'] })
        }
    })
}
