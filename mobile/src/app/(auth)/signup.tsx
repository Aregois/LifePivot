import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Image, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import * as AppleAuthentication from 'expo-apple-authentication'
import { supabase } from '../../utils/supabase'
import { C, Gradients } from '../../constants/theme'
import { FadeInView, GlassCard, PremiumButton, GradientText } from '../../components/ui'
import { useLanguage } from '../../context/LanguageContext'

export default function Signup() {
    const router = useRouter()
    const { t } = useLanguage()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [role, setRole] = useState<'student' | 'tutor'>('student')
    const [loading, setLoading] = useState(false)
    const [nameFocused, setNameFocused] = useState(false)
    const [emailFocused, setEmailFocused] = useState(false)
    const [passwordFocused, setPasswordFocused] = useState(false)
    const [confirmFocused, setConfirmFocused] = useState(false)
    const [appleAuthAvailable, setAppleAuthAvailable] = useState(false)

    useEffect(() => {
        if (Platform.OS === 'ios') {
            AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable).catch(() => setAppleAuthAvailable(false))
        }
    }, [])

    const handleAppleSignUp = async () => {
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
                    Alert.alert('APPLE SIGN UP FAILED', error.message)
                    return
                }

                if (credential.fullName && (credential.fullName.givenName || credential.fullName.familyName)) {
                    const fullName = `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
                    if (fullName && data.user) {
                        await supabase.from('profiles').update({ full_name: fullName }).eq('id', data.user.id)
                    }
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
            Alert.alert('SIGN UP ERROR', e?.message || 'Apple Sign-Up could not be completed.')
        }
    }

    const handleSignup = async () => {
        const trimmedName = name.trim()
        const trimmedEmail = email.trim()
        const trimmedPassword = password.trim()
        const trimmedConfirm = confirm.trim()

        if (!trimmedName || !trimmedEmail || !trimmedPassword) {
            Alert.alert(t('common.error') || 'REQUIRED FIELDS', t('auth.err_name_short') || 'Please complete all required fields.')
            return
        }

        if (trimmedPassword !== trimmedConfirm) {
            Alert.alert(t('common.error') || 'MISMATCH', t('auth.err_password_mismatch') || 'Passwords do not match.')
            return
        }

        if (trimmedPassword.length < 6) {
            Alert.alert(t('common.error') || 'WEAK PASSWORD', t('auth.err_password_short') || 'Password must be at least 6 characters.')
            return
        }

        setLoading(true)
        const { error } = await supabase.auth.signUp({
            email: trimmedEmail,
            password: trimmedPassword,
            options: {
                data: {
                    full_name: trimmedName,
                    role: role
                }
            }
        })
        setLoading(false)

        if (error) {
            Alert.alert(t('common.error') || 'SIGN UP FAILED', error.message)
        } else {
            Alert.alert(
                t('auth.create_account'),
                t('auth.account_created'),
                [{ text: t('auth.login'), onPress: () => router.replace('/(auth)/login') }]
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
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 }}>
                    {/* ── Logo / Header ── */}
                    <FadeInView delay={0} style={{ alignItems: 'center', marginBottom: 28 }}>
                        <Image
                            source={require('../../../assets/images/logo.png')}
                            style={{ width: 70, height: 50, marginBottom: 10 }}
                            resizeMode="contain"
                        />
                        <GradientText
                            style={{
                                fontSize: 12,
                                fontWeight: '900',
                                letterSpacing: 8,
                                textTransform: 'uppercase',
                                marginBottom: 12,
                            }}
                        >
                            {t('auth.title')}
                        </GradientText>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center' }}>
                            {t('auth.create_account')}
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: C.electricBlue, letterSpacing: 1, textTransform: 'uppercase', marginTop: 6, textAlign: 'center' }}>
                            {t('auth.join_platform')}
                        </Text>
                    </FadeInView>

                    {/* ── Input Form ── */}
                    <FadeInView delay={150}>
                        <GlassCard style={{ padding: 20 }}>

                            {/* Account Role Selector */}
                            <Text style={{ fontSize: 10, color: C.textDim, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                                {t('auth.account_type')}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                                <TouchableOpacity
                                    onPress={() => setRole('student')}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 12,
                                        borderRadius: 12,
                                        backgroundColor: role === 'student' ? 'rgba(0, 240, 255, 0.15)' : 'rgba(5, 5, 8, 0.6)',
                                        borderWidth: 1,
                                        borderColor: role === 'student' ? C.electricBlue : C.glassBorder,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ fontSize: 11, fontWeight: '900', color: role === 'student' ? '#FFFFFF' : C.textMuted, letterSpacing: 1 }}>
                                        {t('auth.role_student').toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setRole('tutor')}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 12,
                                        borderRadius: 12,
                                        backgroundColor: role === 'tutor' ? 'rgba(189, 0, 255, 0.15)' : 'rgba(5, 5, 8, 0.6)',
                                        borderWidth: 1,
                                        borderColor: role === 'tutor' ? C.neonViolet : C.glassBorder,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ fontSize: 11, fontWeight: '900', color: role === 'tutor' ? '#FFFFFF' : C.textMuted, letterSpacing: 1 }}>
                                        {t('auth.role_tutor').toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Full Name */}
                            <Text style={{ fontSize: 10, color: C.textDim, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
                                {t('auth.full_name')}
                            </Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder="Alex Chen"
                                placeholderTextColor={C.placeholder}
                                onFocus={() => setNameFocused(true)}
                                onBlur={() => setNameFocused(false)}
                                style={{
                                    backgroundColor: 'rgba(5, 5, 8, 0.6)',
                                    borderWidth: 1,
                                    borderColor: nameFocused ? C.electricBlue : C.glassBorder,
                                    borderRadius: 12,
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    color: '#FFFFFF',
                                    fontWeight: '600',
                                    fontSize: 13,
                                    marginBottom: 14,
                                }}
                            />

                            {/* Email */}
                            <Text style={{ fontSize: 10, color: C.textDim, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
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
                                    backgroundColor: 'rgba(5, 5, 8, 0.6)',
                                    borderWidth: 1,
                                    borderColor: emailFocused ? C.electricBlue : C.glassBorder,
                                    borderRadius: 12,
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    color: '#FFFFFF',
                                    fontWeight: '600',
                                    fontSize: 13,
                                    marginBottom: 14,
                                }}
                            />

                            {/* Password */}
                            <Text style={{ fontSize: 10, color: C.textDim, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
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
                                    backgroundColor: 'rgba(5, 5, 8, 0.6)',
                                    borderWidth: 1,
                                    borderColor: passwordFocused ? C.electricBlue : C.glassBorder,
                                    borderRadius: 12,
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    color: '#FFFFFF',
                                    fontWeight: '600',
                                    fontSize: 13,
                                    marginBottom: 14,
                                }}
                            />

                            {/* Confirm Password */}
                            <Text style={{ fontSize: 10, color: C.textDim, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
                                {t('auth.confirm_password')}
                            </Text>
                            <TextInput
                                value={confirm}
                                onChangeText={setConfirm}
                                secureTextEntry
                                autoCapitalize="none"
                                placeholder="••••••••"
                                placeholderTextColor={C.placeholder}
                                onFocus={() => setConfirmFocused(true)}
                                onBlur={() => setConfirmFocused(false)}
                                style={{
                                    backgroundColor: 'rgba(5, 5, 8, 0.6)',
                                    borderWidth: 1,
                                    borderColor: confirmFocused ? C.electricBlue : C.glassBorder,
                                    borderRadius: 12,
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    color: '#FFFFFF',
                                    fontWeight: '600',
                                    fontSize: 13,
                                }}
                            />
                        </GlassCard>
                    </FadeInView>

                    {/* ── CTA Button ── */}
                    <FadeInView delay={300} style={{ marginTop: 24 }}>
                        <PremiumButton
                            title={t('auth.create_account')}
                            onPress={handleSignup}
                            variant="primary"
                            loading={loading}
                            disabled={loading}
                        />
                    </FadeInView>

                    {/* ── Apple Sign Up (iOS Native Plus) ── */}
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
                                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                                cornerRadius={14}
                                style={{ width: '100%', height: 48 }}
                                onPress={handleAppleSignUp}
                            />
                        </FadeInView>
                    )}

                    {/* ── Sign In Link ── */}
                    <FadeInView delay={400} style={{ marginTop: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
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
                                {t('auth.have_account')}
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
                                    {t('auth.login')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </FadeInView>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    )
}
