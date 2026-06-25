import React, { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../utils/supabase'

export default function EntryPoint() {
    const router = useRouter()

    useEffect(() => {
        // Check current session state on load
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                router.replace('/(tabs)')
            } else {
                router.replace('/(auth)/login')
            }
        })

        // Listen for authentication changes (login, logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                router.replace('/(tabs)')
            } else {
                router.replace('/(auth)/login')
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [router])

    return (
        <View style={{ flex: 1, backgroundColor: '#0B0D17', justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#00F0FF" />
        </View>
    )
}
