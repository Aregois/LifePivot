import React, { Component, ErrorInfo, ReactNode } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { debug } from '../utils/debug'
import { captureError } from '../utils/sentry'

/**
 * LifePivot · Mobile Global Error Boundary
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps any screen or the entire navigator tree.
 * Catches unhandled React render errors, logs them via debug + Sentry,
 * and shows a branded recovery screen instead of a red crash box.
 *
 * Usage (wrap an entire screen or subtree):
 *   <MobileErrorBoundary>
 *     <YourScreen />
 *   </MobileErrorBoundary>
 *
 * Or wrap the root layout for global coverage:
 *   export default Sentry.wrap(function RootLayout() {
 *     return (
 *       <MobileErrorBoundary>
 *         <Stack ... />
 *       </MobileErrorBoundary>
 *     )
 *   })
 */

interface Props {
  children: ReactNode
  /** Optional label for this boundary to help identify crash origin */
  boundaryId?: string
  /** Optional custom fallback component */
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class MobileErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // Log via debug system
    debug.general.error(
      `Render crash [${this.props.boundaryId ?? 'root'}]`,
      error,
      { componentStack: errorInfo.componentStack ?? '' },
    )

    // Forward to Sentry
    captureError(error, {
      boundaryId: this.props.boundaryId ?? 'root',
      componentStack: errorInfo.componentStack ?? '',
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    const { hasError, error, errorInfo } = this.state
    const { children, fallback, boundaryId } = this.props

    if (!hasError || !error) return children

    // Use custom fallback if provided
    if (fallback) return fallback(error, this.handleReset)

    // Default branded crash screen
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>🪲</Text>

        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>
          An unexpected error occurred{boundaryId ? ` in ${boundaryId}` : ''}.
          {'\n'}Your data is safe.
        </Text>

        {/* Stack trace — DEV only */}
        {__DEV__ && (
          <ScrollView style={styles.errorBox} contentContainerStyle={styles.errorBoxContent}>
            <Text style={styles.errorName}>
              {error.name}: {error.message}
            </Text>
            {errorInfo?.componentStack ? (
              <Text style={styles.stack}>{errorInfo.componentStack}</Text>
            ) : null}
            {error.stack ? (
              <Text style={styles.stack}>{error.stack}</Text>
            ) : null}
          </ScrollView>
        )}

        {/* Actions */}
        <TouchableOpacity style={styles.primaryBtn} onPress={this.handleReset} activeOpacity={0.8}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          If this keeps happening, copy the error above and send a Bug Report.
        </Text>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E111F',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  icon: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    color: '#00F0FF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: '#1A1F35',
    borderColor: 'rgba(239,68,68,0.3)',
    borderWidth: 1,
    borderRadius: 12,
    maxHeight: 220,
    width: '100%',
    marginBottom: 20,
  },
  errorBoxContent: {
    padding: 12,
  },
  errorName: {
    color: '#EF4444',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  stack: {
    color: '#64748B',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  primaryBtn: {
    backgroundColor: '#00F0FF',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 24,
  },
  primaryBtnText: {
    color: '#0E111F',
    fontWeight: '700',
    fontSize: 15,
  },
  hint: {
    color: '#475569',
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 260,
  },
})
