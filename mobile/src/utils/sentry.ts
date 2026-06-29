import * as Sentry from '@sentry/react-native';

/**
 * Sentry crash reporting initialisation.
 *
 * The DSN is safe to embed in the client bundle — it is intentionally
 * public-facing. Sentry rate-limits and filters abuse server-side.
 *
 * Call init() once at app startup (root _layout.tsx) before any
 * navigation or business logic runs.
 */
export function init() {
  Sentry.init({
    dsn: 'https://65f83f73e1ebbc5df5229bf66c4e9159@o4511648894877696.ingest.us.sentry.io/4511648921747456',

    // Send performance traces for 20 % of sessions in production.
    // Set to 1.0 while testing to capture every transaction.
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,

    // Breadcrumbs: record the last N events before a crash.
    maxBreadcrumbs: 50,

    // Tag every event with the build environment.
    environment: __DEV__ ? 'development' : 'production',

    // Disable the Sentry debug overlay in production.
    debug: __DEV__,

    // Attach the JS bundle's source-map context to each event so that
    // stack traces are symbolicated on the Sentry dashboard.
    attachStacktrace: true,
  });
}

/** Re-export the full Sentry namespace so callers never import directly. */
export { Sentry };

/**
 * Manually capture an exception — useful inside catch blocks where you
 * still want to handle the error but also want Sentry to record it.
 *
 * @example
 *   try { ... } catch (err) { captureError(err); }
 */
export function captureError(err: unknown, context?: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(err);
  });
}

/**
 * Set the currently authenticated user on all future Sentry events.
 * Call after successful sign-in. Pass null to clear on sign-out.
 */
export function identifyUser(userId: string | null, email?: string) {
  if (userId) {
    Sentry.setUser({ id: userId, email });
  } else {
    Sentry.setUser(null);
  }
}
