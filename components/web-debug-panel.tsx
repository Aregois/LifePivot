'use client'

/**
 * LifePivot · Web Debug Panel
 * ─────────────────────────────────────────────────────────────────────────────
 * DEV-only floating bug panel. Shows all errors captured by utils/debug.ts
 * in real-time inside the running web app.
 *
 * How to open:
 *   • Press  Ctrl + Shift + D  (keyboard shortcut)
 *   • Click the 🪲 floating button in the bottom-right corner
 *
 * Only renders when NODE_ENV === 'development'.
 * Zero bundle cost in production — returns null immediately.
 *
 * Setup: add <WebDebugPanel /> anywhere inside the root layout body.
 * Already added to app/layout.tsx via the debug system setup.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { getErrorLog, clearErrorLog, type ErrorEntry } from '@/utils/debug'

const SEVERITY_COLOR: Record<string, string> = {
  auth:        '#A78BFA',
  economy:     '#34D399',
  shop:        '#F59E0B',
  haptics:     '#60A5FA',
  soundscapes: '#818CF8',
  focus:       '#F472B6',
  goals:       '#10B981',
  tasks:       '#6EE7B7',
  ai:          '#C084FC',
  api:         '#FB923C',
  db:          '#FCA5A5',
  payment:     '#FCD34D',
  onboarding:  '#67E8F9',
  profile:     '#A3E635',
  i18n:        '#94A3B8',
  pwa:         '#D4D4D4',
  perf:        '#F9A8D4',
  general:     '#E2E8F0',
}

export function WebDebugPanel() {
  // Never render in production
  if (process.env.NODE_ENV !== 'development') return null

  return <DebugPanelInner />
}

// Separate inner component so hooks only run in DEV
function DebugPanelInner() {
  const [isOpen, setIsOpen] = useState(false)
  const [errors, setErrors] = useState<ErrorEntry[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll the in-memory error log every second while panel is open
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

  // Ctrl + Shift + D keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setIsOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleClear = () => {
    clearErrorLog()
    setErrors([])
    setExpanded(null)
  }

  const namespaces = ['all', ...Array.from(new Set(errors.map(e => e.namespace)))]
  const filtered = filter === 'all' ? errors : errors.filter(e => e.namespace === filter)

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        onClick={() => setIsOpen(v => !v)}
        title="Debug Panel (Ctrl+Shift+D)"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: errors.length > 0 ? '#EF4444' : '#1A1F35',
          border: '1.5px solid rgba(255,255,255,0.1)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          boxShadow: errors.length > 0
            ? '0 0 12px rgba(239,68,68,0.5)'
            : '0 2px 8px rgba(0,0,0,0.4)',
          transition: 'all 0.2s',
        }}
      >
        🪲
        {errors.length > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            background: '#EF4444',
            color: 'white',
            fontSize: 10,
            fontWeight: 'bold',
            width: 18,
            height: 18,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid #0E111F',
          }}>
            {errors.length > 99 ? '99+' : errors.length}
          </span>
        )}
      </button>

      {/* ── Panel ── */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: 72,
          right: 16,
          width: 480,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: '70vh',
          background: '#0E111F',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          zIndex: 9998,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          fontFamily: 'monospace',
        }}>

          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#13172A',
          }}>
            <span style={{ color: '#00F0FF', fontWeight: 'bold', fontSize: 13 }}>
              🪲 Debug Panel &nbsp;
              <span style={{ color: '#94A3B8', fontWeight: 'normal', fontSize: 11 }}>
                Ctrl+Shift+D
              </span>
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {errors.length > 0 && (
                <button
                  onClick={handleClear}
                  style={{
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#EF4444',
                    borderRadius: 6,
                    padding: '2px 10px',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  fontSize: 16,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Namespace filter pills */}
          {namespaces.length > 1 && (
            <div style={{
              display: 'flex',
              gap: 6,
              padding: '8px 12px',
              overflowX: 'auto',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              flexShrink: 0,
            }}>
              {namespaces.map(ns => (
                <button
                  key={ns}
                  onClick={() => setFilter(ns)}
                  style={{
                    background: filter === ns ? '#1E293B' : 'transparent',
                    border: `1px solid ${filter === ns ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
                    color: filter === ns
                      ? (SEVERITY_COLOR[ns] ?? '#E2E8F0')
                      : '#64748B',
                    borderRadius: 999,
                    padding: '2px 10px',
                    fontSize: 10,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontFamily: 'monospace',
                    fontWeight: filter === ns ? 'bold' : 'normal',
                  }}
                >
                  {ns}
                </button>
              ))}
            </div>
          )}

          {/* Error list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{
                padding: 32,
                textAlign: 'center',
                color: '#334155',
                fontSize: 13,
              }}>
                {errors.length === 0 ? '✅ No errors captured yet' : 'No errors in this namespace'}
              </div>
            ) : (
              [...filtered].reverse().map((entry, i) => {
                const color = SEVERITY_COLOR[entry.namespace] ?? '#E2E8F0'
                const isExp = expanded === i
                return (
                  <div
                    key={i}
                    onClick={() => setExpanded(isExp ? null : i)}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      background: isExp ? '#13172A' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        color,
                        fontSize: 9,
                        fontWeight: 'bold',
                        background: `${color}18`,
                        border: `1px solid ${color}33`,
                        borderRadius: 4,
                        padding: '1px 6px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}>
                        {entry.namespace.toUpperCase()}
                      </span>
                      <span style={{ color: '#CBD5E1', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.message}
                      </span>
                      <span style={{ color: '#475569', fontSize: 10, flexShrink: 0 }}>
                        {entry.timestamp.slice(11, 19)}
                      </span>
                    </div>

                    {/* Expanded detail */}
                    {isExp && (
                      <div style={{ marginTop: 8 }}>
                        {entry.error && (
                          <div style={{
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: 8,
                            padding: '8px 10px',
                            marginBottom: 6,
                          }}>
                            <div style={{ color: '#EF4444', fontSize: 11, fontWeight: 'bold', marginBottom: 2 }}>
                              {entry.error.message}
                            </div>
                            {entry.error.stack && (
                              <pre style={{ color: '#64748B', fontSize: 10, margin: 0, whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: 120 }}>
                                {entry.error.stack}
                              </pre>
                            )}
                          </div>
                        )}
                        {entry.context && Object.keys(entry.context).length > 0 && (
                          <pre style={{
                            color: '#94A3B8',
                            fontSize: 10,
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: 6,
                            padding: '6px 8px',
                            margin: 0,
                            overflowX: 'auto',
                          }}>
                            {JSON.stringify(entry.context, null, 2)}
                          </pre>
                        )}
                        <div style={{ color: '#334155', fontSize: 10, marginTop: 4 }}>
                          📍 {entry.url}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '6px 14px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            color: '#334155',
            fontSize: 10,
            background: '#0A0D1A',
          }}>
            {filtered.length} error{filtered.length !== 1 ? 's' : ''} · auto-refreshes every 1s
          </div>
        </div>
      )}
    </>
  )
}
