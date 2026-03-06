import 'package:flutter/foundation.dart';

/// PostHog analytics service for VitaMind mobile.
///
/// To enable: add `posthog_flutter: ^4.0.0` to pubspec.yaml and
/// uncomment the PostHog import + initialization below.
///
/// Usage:
///   await AnalyticsService.init(apiKey: dotenv.env['POSTHOG_KEY'] ?? '');
///   AnalyticsService.track('task_created', {'priority': 'high'});
class AnalyticsService {
  static bool _initialized = false;

  /// Initialize PostHog with the given API key.
  /// No-op if key is empty or in debug mode.
  static Future<void> init({required String apiKey, String? host}) async {
    if (apiKey.isEmpty) {
      debugPrint('[Analytics] Skipping — no API key');
      return;
    }

    // TODO: Uncomment when posthog_flutter is added to pubspec.yaml:
    // final config = PostHogConfig(apiKey);
    // config.host = host ?? 'https://app.posthog.com';
    // config.captureApplicationLifecycleEvents = true;
    // await Posthog().setup(config);
    _initialized = true;
    debugPrint('[Analytics] Initialized');
  }

  /// Track a custom event.
  static void track(String event, [Map<String, dynamic>? properties]) {
    if (!_initialized) return;
    // TODO: Uncomment when posthog_flutter is added:
    // Posthog().capture(eventName: event, properties: properties);
    debugPrint('[Analytics] $event ${properties ?? ''}');
  }

  /// Identify a user after login.
  static void identify(String userId, [Map<String, dynamic>? traits]) {
    if (!_initialized) return;
    // TODO: Uncomment when posthog_flutter is added:
    // Posthog().identify(userId: userId, userProperties: traits);
    debugPrint('[Analytics] Identify: $userId');
  }

  /// Reset analytics on logout.
  static void reset() {
    if (!_initialized) return;
    // TODO: Uncomment when posthog_flutter is added:
    // Posthog().reset();
    debugPrint('[Analytics] Reset');
  }
}

/// Pre-defined event names for consistency across platforms.
class AnalyticsEvents {
  static const signUp = 'sign_up';
  static const login = 'login';
  static const logout = 'logout';
  static const taskCreated = 'task_created';
  static const taskCompleted = 'task_completed';
  static const goalCreated = 'goal_created';
  static const habitLogged = 'habit_logged';
  static const momentumViewed = 'momentum_viewed';
  static const aiChatSent = 'ai_chat_sent';
  static const aiPlanGenerated = 'ai_plan_generated';
  static const focusSessionStarted = 'focus_session_started';
  static const focusSessionCompleted = 'focus_session_completed';
  static const contractCreated = 'contract_created';
  static const voiceLogRecorded = 'voice_log_recorded';
}
