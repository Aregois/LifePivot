import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import * as AppleAuthentication from 'expo-apple-authentication'
import { supabase } from '../../utils/supabase'
import { C, Gradients } from '../../constants/theme'
import FadeInView from '../../components/ui/FadeInView'
import { GlassCard } from '../../components/ui/GlassCard'
import { PremiumButton } from '../../components/ui/PremiumButton'
import { GradientText } from '../../components/ui/GradientText'
import { useLanguage } from '../../context/LanguageContext'

export default function Login() {
    const router = useRouter()
    const { t } = useLanguage()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [emailFocused, setEmailFocused] = useState(false)
    const [passwordFocused, setPasswordFocused] = useState(false)
    const [appleAuthAvailable, setAppleAuthAvailable] = useState(false)

    useEffect(() => {
        if (Platform.OS === 'ios') {
            AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable).catch(() => setAppleAuthAvailable(false))
        }
    }, [])

    const handleLogin = async () => {
        const trimmedEmail = email.trim()
        const trimmedPassword = password.trim()
        if (!trimmedEmail || !trimmedPassword) {
            Alert.alert(t('common.error') || 'ERROR', t('auth.err_confirm_empty') || 'Please fill in all fields')
            return
        }

        setLoading(true)
        const { error } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password: trimmedPassword
        })
        setLoading(false)

        if (error) {
            Alert.alert(t('common.error') || 'SIGN IN FAILED', error.message)
        } else {
            router.replace('/(tabs)')
        }
    }

    const handleForgotPassword = async () => {
        const trimmedEmail = email.trim()
        if (!trimmedEmail) {
            Alert.alert('RESET PASSWORD', 'Please enter your email address in the field above first.')
            return
        }

        try {
            setLoading(true)
            const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail)
            setLoading(false)
            if (error) {
                Alert.alert('RESET FAILED', error.message)
            } else {
                Alert.alert(
                    'CHECK YOUR EMAIL',
                    'A password reset link has been dispatched to your email address.'
                )
            }
        } catch (err: any) {
            setLoading(false)
            Alert.alert('ERROR', err?.message || 'Could not send reset email.')
        }
    }

    const handleAppleSignIn = async () => {
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            })

            if (credential.identityToken) {
                setLoading(true)
                const { data, error } = await supabase.auth.signInWithIdToken({
                    provider: 'apple',
                    token: credential.identityToken,
                })
                setLoading(false)

                if (error) {
                    Alert.alert('APPLE SIGN IN FAILED', error.message)
                    return
                }

                if (data?.session) {
                    router.replace('/(tabs)')
                }
            }
        } catch (e: any) {
            setLoading(false)
            if (e.code === 'ERR_REQUEST_CANCELED') {
                return
            }
            Alert.alert('SIGN IN ERROR', e?.message || 'Apple Sign-In could not be completed.')
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
                        source={require('../../../assets/images/logo.png')}
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
                        {t('auth.title')}
                    </GradientText>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center' }}>
                        {t('auth.subtitle')}
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
                            {t('auth.email')}
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
                            {t('auth.password')}
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

                        {/* Forgot Password Link */}
                        <TouchableOpacity
                            onPress={handleForgotPassword}
                            activeOpacity={0.7}
                            style={{ alignSelf: 'flex-end', marginTop: 12 }}
                        >
                            <Text
                                style={{
                                    fontSize: 10,
                                    color: C.electricBlue,
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    letterSpacing: 1.2,
                                }}
                            >
                                FORGOT PASSWORD?
                            </Text>
                        </TouchableOpacity>
                    </GlassCard>
                </FadeInView>

                {/* ── CTA ── */}
                <FadeInView delay={300} style={{ marginTop: 24 }}>
                    <PremiumButton
                        title={t('auth.login')}
                        onPress={handleLogin}
                        variant="primary"
                        loading={loading}
                        disabled={loading}
                    />
                </FadeInView>

                {/* ── Apple Sign In (iOS Native Plus) ── */}
                {Platform.OS === 'ios' && appleAuthAvailable && (
                    <FadeInView delay={350} style={{ marginTop: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 12 }}>
                            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
                            <Text
                                style={{
                                    color: C.textDim,
                                    fontSize: 9,
                                    fontWeight: '800',
                                    marginHorizontal: 12,
                                    letterSpacing: 2,
                                }}
                            >
                                OR
                            </Text>
                            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
                        </View>
                        <AppleAuthentication.AppleAuthenticationButton
                            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                            cornerRadius={14}
                            style={{ width: '100%', height: 48 }}
                            onPress={handleAppleSignIn}
                        />
                    </FadeInView>
                )}

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
                            {t('auth.no_account')}
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
                                {t('auth.signup')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </FadeInView>
            </KeyboardAvoidingView>
        </LinearGradient>
    )
}
