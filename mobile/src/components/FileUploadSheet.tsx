import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import Constants from 'expo-constants'
import { supabase } from '../utils/supabase'
import { C, Shadows, BorderRadius } from '../constants/theme'
import { GlassCard, GlowBadge, FadeInView } from './ui'

interface FileUploadSheetProps {
  workspaceId?: string
  planId?: string
}

interface DocItem {
  id: string
  file_name: string
  file_size: number
  mime_type: string
  created_at: string
  user_id?: string
}

const getApiBase = () => {
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl
  }
  const hostUri = Constants.expoConfig?.hostUri
  if (hostUri) {
    const ip = hostUri.split(':')[0]
    return `http://${ip}:3000`
  }
  return 'http://localhost:3000'
}

const API_BASE = getApiBase()

const getToken = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token || ''
}

export function FileUploadSheet({ workspaceId, planId }: FileUploadSheetProps) {
  const [docs, setDocs] = useState<DocItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchDocs = async () => {
      if (!workspaceId && !planId) return
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
        }

        const token = await getToken()
        const param = workspaceId ? `workspaceId=${workspaceId}` : `planId=${planId}`
        const res = await fetch(`${API_BASE}/api/documents/list?${param}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const json = await res.json()
          setDocs(json.documents || [])
        }
      } catch (_) {
        // Silently fail on initial fetch — user can still upload
      }
    }
    fetchDocs()
  }, [workspaceId, planId])

  const handlePickDocument = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ],
      copyToCacheDirectory: true,
    })
    if (!result.canceled && result.assets?.[0]) {
      await uploadFile(
        result.assets[0].uri,
        result.assets[0].name,
        result.assets[0].mimeType || 'application/pdf',
        result.assets[0].size || 0,
      )
    }
  }

  const handleTakePhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('PERMISSION NEEDED', 'Camera access is required to capture contents pages.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [3, 4],
    })
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0]
      const fileName = `contents_page_${Date.now()}.jpg`
      await uploadFile(asset.uri, fileName, 'image/jpeg', asset.fileSize || 0)
    }
  }

  const uploadFile = async (uri: string, name: string, mimeType: string, size: number) => {
    if (docs.length >= 5) {
      setWarning('Maximum 5 files reached')
      return
    }
    if (size > 10 * 1024 * 1024) {
      Alert.alert('FILE TOO LARGE', 'Files must be under 10MB')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const token = await getToken()
      const formData = new FormData()
      formData.append('file', { uri, name, type: mimeType } as any)
      if (workspaceId) formData.append('workspaceId', workspaceId)
      if (planId) formData.append('planId', planId)

      const res = await fetch(`${API_BASE}/api/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Upload failed')
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        setDocs(prev => [
          ...prev,
          {
            id: json.id,
            file_name: json.fileName,
            file_size: json.fileSize,
            mime_type: mimeType,
            created_at: new Date().toISOString(),
            user_id: currentUserId || undefined,
          },
        ])
      }
    } catch (e: any) {
      setError(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (docId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const token = await getToken()
    const res = await fetch(`${API_BASE}/api/documents/${docId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      setDocs(prev => prev.filter(d => d.id !== docId))
    }
  }

  return (
    <View>
      {/* Header */}
      <Text
        style={{
          fontSize: 9,
          color: C.electricBlue,
          fontWeight: '900',
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        📚 STUDY MATERIALS
      </Text>
      <Text
        style={{
          fontSize: 10,
          color: '#F59E0B',
          fontWeight: '700',
          marginBottom: 16,
          lineHeight: 15,
        }}
      >
        ⚠️ Upload ONLY the Title Page and Table of Contents — do not upload full textbooks.
      </Text>

      {/* Two Action Buttons */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <TouchableOpacity
          onPress={handlePickDocument}
          disabled={uploading}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,240,255,0.05)',
            borderWidth: 1,
            borderColor: 'rgba(0,240,255,0.2)',
            borderRadius: BorderRadius.lg,
            paddingVertical: 14,
            gap: 8,
            ...Shadows.glowSmall(C.electricBlue, 0.15),
          }}
        >
          <Text style={{ fontSize: 18 }}>📁</Text>
          <View>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '900',
                color: C.electricBlue,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              PDF SNIPPET
            </Text>
            <Text
              style={{
                fontSize: 9,
                color: C.textDim,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              SELECT FILE
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleTakePhoto}
          disabled={uploading}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(189,0,255,0.05)',
            borderWidth: 1,
            borderColor: 'rgba(189,0,255,0.2)',
            borderRadius: BorderRadius.lg,
            paddingVertical: 14,
            gap: 8,
            ...Shadows.glowSmall(C.neonViolet, 0.15),
          }}
        >
          <Text style={{ fontSize: 18 }}>📸</Text>
          <View>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '900',
                color: C.neonViolet,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              TAKE PHOTO
            </Text>
            <Text
              style={{
                fontSize: 9,
                color: C.textDim,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              CONTENTS PAGE
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Upload Progress */}
      {uploading && (
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}
        >
          <ActivityIndicator size="small" color={C.electricBlue} />
          <Text
            style={{
              fontSize: 10,
              color: C.textDim,
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            UPLOADING...
          </Text>
        </View>
      )}

      {/* Warning */}
      {(warning || docs.length >= 3) && (
        <Text
          style={{
            fontSize: 9,
            color: '#F59E0B',
            fontWeight: '700',
            marginBottom: 10,
            letterSpacing: 0.5,
          }}
        >
          ⚠️ {warning || 'TIP: Keep image snippets under 2MB for best AI performance.'}
        </Text>
      )}

      {/* Error */}
      {error && (
        <Text
          style={{ fontSize: 9, color: '#F43F5E', fontWeight: '700', marginBottom: 10 }}
        >
          {error}
        </Text>
      )}

      {/* Uploaded Files List */}
      {docs.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text
            style={{
              fontSize: 9,
              color: C.textDim,
              fontWeight: '700',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            UPLOADED ({docs.length}/5)
          </Text>
          {docs.map(doc => (
            <View
              key={doc.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderWidth: 1,
                borderColor: C.glassBorder,
                borderRadius: BorderRadius.md,
                padding: 12,
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 16 }}>
                {doc.mime_type?.startsWith('image') ? '🖼️' : '📄'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}
                  numberOfLines={1}
                >
                  {doc.file_name}
                </Text>
                <Text style={{ fontSize: 9, color: C.textDim }}>
                  {doc.file_size ? `${Math.round(doc.file_size / 1024)}KB` : ''}
                </Text>
              </View>
              {(!doc.user_id || doc.user_id === currentUserId) && (
                <TouchableOpacity onPress={() => handleDelete(doc.id)}>
                  <Text style={{ fontSize: 14, color: '#F43F5E' }}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
