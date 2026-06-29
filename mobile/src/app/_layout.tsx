import React from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '../components/ui'
import { init as initSentry, Sentry } from '../utils/sentry'

// Initialise Sentry crash reporting before any navigation or business
// logic executes. Module-scope call ensures it fires on bundle load.
initSentry()

// Initialize TanStack Query Client for caching API states
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false
        }
    }
})

function RootLayout() {
    return (
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <Stack screenOptions={{ headerShown: false }}>
                    {/* Authentication Screens */}
                    <Stack.Screen name="(auth)" />
                    
                    {/* Main Tab Screens (Dashboard, Plan, Shop, Profile) */}
                    <Stack.Screen name="(tabs)" />
                    
                    {/* Workspaces Stack */}
                    <Stack.Screen name="workspaces" />
                    
                    {/* Marketplace Stack */}
                    <Stack.Screen name="marketplace" />

                    {/* Personal Plans Stack */}
                    <Stack.Screen name="plan" />
                    
                    {/* Subscription Sheet Modal */}
                    <Stack.Screen 
                        name="modal/subscribe" 
                        options={{ 
                            headerShown: true, 
                            title: 'POWER SUBSCRIPTION',
                            presentation: 'modal',
                            headerStyle: {
                                backgroundColor: '#0E111F',
                            },
                            headerTintColor: '#00F0FF',
                            headerTitleStyle: {
                                fontWeight: 'bold',
                            },
                            headerTitleAlign: 'center'
                        }} 
                    />
                </Stack>
            </ToastProvider>
        </QueryClientProvider>
    )
}

// Sentry.wrap captures unhandled JS exceptions, route-change breadcrumbs,
// and slow render performance traces across the entire navigator tree.
export default Sentry.wrap(RootLayout)

