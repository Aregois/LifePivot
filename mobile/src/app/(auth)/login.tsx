import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../../utils/supabase'
import { C, Gradients } from '../../constants/theme'
import FadeInView from '../../components/ui/FadeInView'
import { GlassCard } from '../../components/ui/GlassCard'
import { PremiumButton } from '../../components/ui/PremiumButton'
import { GradientText } from '../../components/ui/GradientText'

export default function Login() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [emailFocused, setEmailFocused] = useState(false)
    const [passwordFocused, setPasswordFocused] = useState(false)

    const handleLogin = async () => {
        const trimmedEmail = email.trim()
        const trimmedPassword = password.trim()
        if (!trimmedEmail || !trimmedPassword) {
            Alert.alert('ERROR', 'Please fill in all fields')
            return
        }

        setLoading(true)
        const { error } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password: trimmedPassword
        })
        setLoading(false)

        if (error) {
            Alert.alert('SIGN IN FAILED', error.message)
        } else {
            router.replace('/(tabs)')
        }
    }

    return (
        <LinearGradient
            colors={[...Gradients.loginBg]}
            style={{ flex: 1 }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 justify-center px-6"
            >
                {/* ── Logo / Hero Section ── */}
                <FadeInView delay={0} style={{ alignItems: 'center', marginBottom: 40 }}>
                    {/* Decorative glow orb */}
                    <View
                        style={{
                            position: 'absolute',
                            top: -60,
                            width: 160,
                            height: 160,
                            borderRadius: 80,
                            backgroundColor: 'rgba(0, 240, 255, 0.05)',
                        }}
                        className="blur-3xl"
                    />
                    <GradientText
                        style={{
                            fontSize: 11,
                            fontWeight: '900',
                            letterSpacing: 8,
                            textTransform: 'uppercase',
                            marginBottom: 6,
                        }}
                    >
                        LIFEPIVOT
                    </GradientText>
                    <Text className="text-3xl font-black text-white uppercase tracking-wider">
                        WELCOME BACK
                    </Text>
                    <Text
                        style={{
                            fontSize: 10,
                            color: C.textDim,
                            letterSpacing: 3,
                            textTransform: 'uppercase',
                            marginTop: 8,
                        }}
                    >
                        RESUME YOUR LEARNING JOURNEY
                    </Text>
                </FadeInView>

                {/* ── Input Section ── */}
                <FadeInView delay={150}>
                    <GlassCard style={{ padding: 24 }}>
                        {/* Email */}
                        <Text
                            style={{
                                fontSize: 10,
                                color: C.textDim,
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: 2,
                                marginBottom: 8,
                            }}
                        >
                            EMAIL ADDRESS
                        </Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholder="pathseeker@lifepivot.com"
                            placeholderTextColor={C.placeholder}
                            onFocus={() => setEmailFocused(true)}
                            onBlur={() => setEmailFocused(false)}
                            style={{
                                width: '100%',
                                backgroundColor: 'rgba(11, 13, 23, 0.6)',
                                borderWidth: 1,
                                borderColor: emailFocused ? C.electricBlue : 'rgba(255, 255, 255, 0.06)',
                                borderRadius: 12,
                                paddingHorizontal: 16,
                                paddingVertical: 14,
                                color: '#FFFFFF',
                                fontWeight: '600',
                                fontSize: 13,
                                marginBottom: 20,
                            }}
                        />

                        {/* Password */}
                        <Text
                            style={{
                                fontSize: 10,
                                color: C.textDim,
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: 2,
                                marginBottom: 8,
                            }}
                        >
                            PASSWORD
                        </Text>
                        <TextInput
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            placeholder="••••••••"
                            placeholderTextColor={C.placeholder}
                            onFocus={() => setPasswordFocused(true)}
                            onBlur={() => setPasswordFocused(false)}
                            style={{
                                width: '100%',
                                backgroundColor: 'rgba(11, 13, 23, 0.6)',
                                borderWidth: 1,
                                borderColor: passwordFocused ? C.electricBlue : 'rgba(255, 255, 255, 0.06)',
                                borderRadius: 12,
                                paddingHorizontal: 16,
                                paddingVertical: 14,
                                color: '#FFFFFF',
                                fontWeight: '600',
                                fontSize: 13,
                            }}
                        />
                    </GlassCard>
                </FadeInView>

                {/* ── CTA ── */}
                <FadeInView delay={300} style={{ marginTop: 28 }}>
                    <PremiumButton
                        title="SIGN IN"
                        onPress={handleLogin}
                        variant="primary"
                        loading={loading}
                        disabled={loading}
                    />
                </FadeInView>

                {/* ── Sign Up Link ── */}
                <FadeInView delay={400} style={{ marginTop: 24 }}>
                    <View className="flex-row justify-center items-center">
                        <Text
                            style={{
                                fontSize: 11,
                                color: C.inactive,
                                textTransform: 'uppercase',
                                letterSpacing: 1.5,
                                marginRight: 6,
                            }}
                        >
                            NEW TO LIFEPIVOT?
                        </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                            <Text
                                style={{
                                    fontSize: 11,
                                    color: C.electricBlue,
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    letterSpacing: 1.5,
                                }}
                            >
                                SIGN UP
                            </Text>
                        </TouchableOpacity>
                    </View>
                </FadeInView>
            </KeyboardAvoidingView>
        </LinearGradient>
    )
}
