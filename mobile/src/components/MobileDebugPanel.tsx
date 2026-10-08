import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Animated,
  Platform,
  Pressable,
} from 'react-native'
import { getErrorLog, clearErrorLog, type ErrorEntry } from '../utils/debug'

/**
 * LifePivot · Mobile Debug Panel
 * ─────────────────────────────────────────────────────────────────────────────
 * DEV-only in-app bug panel for the Expo / React Native app.
 * Renders as zero in production (__DEV__ === false).
 *
 * How to open:
 *   • Tap the floating 🪲 button (bottom-right corner of any screen)
 *   • Shake the device / simulator
 *
 * Setup: add <MobileDebugPanel /> inside the root layout (already done).
 */

const NAMESPACE_COLORS: Record<string, string> = {
  auth:          '#A78BFA',
  economy:       '#34D399',
  shop:          '#F59E0B',
  haptics:       '#60A5FA',
  soundscapes:   '#818CF8',
  focus:         '#F472B6',
  goals:         '#10B981',
  tasks:         '#6EE7B7',
  ai:            '#C084FC',
  api:           '#FB923C',
  db:            '#FCA5A5',
  payment:       '#FCD34D',
  onboarding:    '#67E8F9',
  profile:       '#A3E635',
  i18n:          '#94A3B8',
  notifications: '#67E8F9',
  perf:          '#F9A8D4',
  general:       '#E2E8F0',
}

export function MobileDebugPanel() {
  if (!__DEV__) return null
  return <MobileDebugPanelInner />
}

function MobileDebugPanelInner() {
  const [isOpen, setIsOpen]       = useState(false)
  const [errors, setErrors]       = useState<ErrorEntry[]>([])
  const [expanded, setExpanded]   = useState<number | null>(null)
  const [filter, setFilter]       = useState<string>('all')
  const pulseAnim                 = useRef(new Animated.Value(1)).current
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null)

  // Refresh log every second while open
  const refresh = useCallback(() => {
    setErrors([...getErrorLog()])
  }, [])

  useEffect(() => {
    if (isOpen) {
      refresh()
      intervalRef.current = setInterval(refresh, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isOpen, refresh])

  // Also refresh every 2s in background to keep badge count fresh
  useEffect(() => {
    const bg = setInterval(() => setErrors([...getErrorLog()]), 2000)
    return () => clearInterval(bg)
  }, [])

  // Pulse animation when there are errors
  useEffect(() => {
    if (errors.length > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ])
      )
      pulse.start()
      return () => pulse.stop()
    } else {
      pulseAnim.setValue(1)
    }
  }, [errors.length > 0])

  const handleClear = () => {
    clearErrorLog()
    setErrors([])
    setExpanded(null)
  }

  const namespaces = ['all', ...Array.from(new Set(errors.map(e => e.namespace)))]
  const filtered   = filter === 'all' ? errors : errors.filter(e => e.namespace === filter)
  const reversed   = [...filtered].reverse()

  return (
    <>
      {/* ── Floating trigger button ── */}
      <Animated.View style={[styles.fab, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity
          onPress={() => setIsOpen(true)}
          activeOpacity={0.8}
          style={[styles.fabInner, errors.length > 0 && styles.fabWithErrors]}
        >
          <Text style={styles.fabIcon}>🪲</Text>
          {errors.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {errors.length > 99 ? '99+' : String(errors.length)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* ── Debug Modal ── */}
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modal}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>🪲 Debug Panel</Text>
            <View style={styles.headerActions}>
              {errors.length > 0 && (
                <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Namespace filter pills */}
          {namespaces.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.pillsScroll}
              contentContainerStyle={styles.pillsContent}
            >
              {namespaces.map(ns => {
                const color = ns === 'all' ? '#00F0FF' : (NAMESPACE_COLORS[ns] ?? '#E2E8F0')
                const active = filter === ns
                return (
                  <TouchableOpacity
                    key={ns}
                    onPress={() => setFilter(ns)}
                    style={[
                      styles.pill,
                      active && { backgroundColor: `${color}22`, borderColor: `${color}66` },
                    ]}
                  >
                    <Text style={[styles.pillText, active && { color }]}>
                      {ns.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          )}

          {/* Error list */}
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {reversed.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>✅</Text>
                <Text style={styles.emptyText}>
                  {errors.length === 0
                    ? 'No errors captured yet'
                    : 'No errors in this namespace'}
                </Text>
              </View>
            ) : (
              reversed.map((entry, i) => {
                const color = NAMESPACE_COLORS[entry.namespace] ?? '#E2E8F0'
                const isExp = expanded === i
                return (
                  <Pressable
                    key={i}
                    onPress={() => setExpanded(isExp ? null : i)}
                    style={({ pressed }) => [
                      styles.errorRow,
                      isExp && styles.errorRowExpanded,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    {/* Row */}
                    <View style={styles.errorRowMain}>
                      <View style={[styles.nsTag, { backgroundColor: `${color}20`, borderColor: `${color}44` }]}>
                        <Text style={[styles.nsTagText, { color }]}>
                          {entry.namespace.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.errorMsg} numberOfLines={isExp ? undefined : 1}>
                        {entry.message}
                      </Text>
                      <Text style={styles.errorTime}>
                        {entry.timestamp.slice(11, 19)}
                      </Text>
                    </View>

                    {/* Expanded detail */}
                    {isExp && (
                      <View style={styles.errorDetail}>
                        {entry.error && (
                          <View style={styles.errorBox}>
                            <Text style={styles.errorBoxMessage}>{entry.error.message}</Text>
                            {entry.error.stack ? (
                              <Text style={styles.errorStack}>{entry.error.stack}</Text>
                            ) : null}
                          </View>
                        )}
                        {entry.context && Object.keys(entry.context).length > 0 && (
                          <View style={styles.contextBox}>
                            <Text style={styles.contextText}>
                              {JSON.stringify(entry.context, null, 2)}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.platformText}>
                          📱 {entry.platform}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                )
              })
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {filtered.length} error{filtered.length !== 1 ? 's' : ''} · auto-refreshes every 1s
            </Text>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    right: 16,
    zIndex: 9999,
  },
  fabInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1A1F35',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabWithErrors: {
    backgroundColor: '#7F1D1D',
    borderColor: 'rgba(239,68,68,0.4)',
    shadowColor: '#EF4444',
    shadowOpacity: 0.5,
  },
  fabIcon: {
    fontSize: 22,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#0E111F',
  },
  badgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '800',
  },
  modal: {
    flex: 1,
    backgroundColor: '#0E111F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#13172A',
  },
  headerTitle: {
    color: '#00F0FF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  clearBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: '#64748B',
    fontSize: 18,
  },
  pillsScroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  pillsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    flexDirection: 'row',
  },
  pill: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    color: '#334155',
    fontSize: 14,
    textAlign: 'center',
  },
  errorRow: {
    padding: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  errorRowExpanded: {
    backgroundColor: '#13172A',
  },
  errorRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nsTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    flexShrink: 0,
  },
  nsTagText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorMsg: {
    color: '#CBD5E1',
    fontSize: 12,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorTime: {
    color: '#475569',
    fontSize: 10,
    flexShrink: 0,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorDetail: {
    marginTop: 10,
    gap: 6,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 8,
    padding: 10,
  },
  errorBoxMessage: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
  errorStack: {
    color: '#64748B',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 15,
  },
  contextBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
    padding: 8,
  },
  contextText: {
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 14,
  },
  platformText: {
    color: '#334155',
    fontSize: 10,
  },
  footer: {
    padding: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    backgroundColor: '#0A0D1A',
  },
  footerText: {
    color: '#334155',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
})
