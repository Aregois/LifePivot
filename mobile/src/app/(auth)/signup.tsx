import React, { useState } from 'react'
import { View, Text, TextInput, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../../utils/supabase'
import { C, Gradients } from '../../constants/theme'
import { FadeInView, GlassCard, PremiumButton, GradientText } from '../../components/ui'

export default function Signup() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [emailFocused, setEmailFocused] = useState(false)
    const [passwordFocused, setPasswordFocused] = useState(false)

    const handleSignup = async () => {
        const trimmedEmail = email.trim()
        const trimmedPassword = password.trim()
        if (!trimmedEmail || !trimmedPassword) {
            Alert.alert('ERROR', 'Please fill in all fields')
            return
        }

        setLoading(true)
        const { error } = await supabase.auth.signUp({
            email: trimmedEmail,
            password: trimmedPassword
        })
        setLoading(false)

        if (error) {
            Alert.alert('SIGN UP FAILED', error.message)
        } else {
            Alert.alert(
                'ACCOUNT CREATED',
                'Check your email box to verify your account registration!',
                [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
            )
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
                    <Image
                        source={require('../../assets/images/logo.png')}
                        style={{ width: 80, height: 60, marginBottom: 12 }}
                        resizeMode="contain"
                    />
                    <GradientText
                        style={{
                            fontSize: 12,
                            fontWeight: '900',
                            letterSpacing: 8,
                            textTransform: 'uppercase',
                            marginBottom: 16,
                        }}
                    >
                        LIFEPIVOT
                    </GradientText>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center' }}>
                        Plan your goals.
                    </Text>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center' }}>
                        Track your habits.
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: C.electricBlue, letterSpacing: 1, textTransform: 'uppercase', marginTop: 12, textAlign: 'center' }}>
                        Build your future one day at a time.
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
                                letterSpacing: 1.5,
                                textTransform: 'uppercase',
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
                                backgroundColor: 'rgba(5, 5, 8, 0.6)',
                                borderWidth: 1,
                                borderColor: emailFocused ? C.electricBlue : C.glassBorder,
                                borderRadius: 12,
                                paddingHorizontal: 16,
                                paddingVertical: 14,
                                color: '#FFFFFF',
                                fontWeight: '600',
                                fontSize: 13,
                                marginBottom: 16,
                            }}
                        />

                        {/* Password */}
                        <Text
                            style={{
                                fontSize: 10,
                                color: C.textDim,
                                fontWeight: '700',
                                letterSpacing: 1.5,
                                textTransform: 'uppercase',
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
                            placeholder="Minimum 6 characters"
                            placeholderTextColor={C.placeholder}
                            onFocus={() => setPasswordFocused(true)}
                            onBlur={() => setPasswordFocused(false)}
                            style={{
                                backgroundColor: 'rgba(5, 5, 8, 0.6)',
                                borderWidth: 1,
                                borderColor: passwordFocused ? C.electricBlue : C.glassBorder,
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
                        title="SIGN UP"
                        onPress={handleSignup}
                        variant="primary"
                        loading={loading}
                        disabled={loading}
                    />
                </FadeInView>

                {/* ── Sign In Link ── */}
                <FadeInView delay={400} style={{ marginTop: 24 }}>
                    <View className="flex-row justify-center items-center">
                        <Text
                            style={{
                                fontSize: 11,
                                color: C.textMuted,
                                fontWeight: '700',
                                letterSpacing: 1,
                                textTransform: 'uppercase',
                                marginRight: 6,
                            }}
                        >
                            ALREADY HAVE AN ACCOUNT?
                        </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                            <Text
                                style={{
                                    fontSize: 11,
                                    color: C.electricBlue,
                                    fontWeight: '900',
                                    letterSpacing: 1,
                                    textTransform: 'uppercase',
                                }}
                            >
                                SIGN IN
                            </Text>
                        </TouchableOpacity>
                    </View>
                </FadeInView>
            </KeyboardAvoidingView>
        </LinearGradient>
    )
}
