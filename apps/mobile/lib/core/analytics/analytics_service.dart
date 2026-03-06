import 'package:flutter/foundation.dart';
import 'package:posthog_flutter/posthog_flutter.dart';

/// PostHog analytics service for VitaMind mobile.
///
/// Usage:
///   await AnalyticsService.init(apiKey: dotenv.env['POSTHOG_KEY'] ?? '');
///   AnalyticsService.track('task_created', {'priority': 'high'});
class AnalyticsService {
  static bool _initialized = false;

  /// Initialize PostHog with the given API key.
  /// No-op if key is empty.
  static Future<void> init({required String apiKey, String? host}) async {
    if (apiKey.isEmpty) {
      debugPrint('[Analytics] Skipping — no API key');
      return;
    }

    final config = PostHogConfig(apiKey);
    config.host = host ?? 'https://app.posthog.com';
    config.captureApplicationLifecycleEvents = true;
    await Posthog().setup(config);
    _initialized = true;
    debugPrint('[Analytics] Initialized');
  }

  /// Track a custom event.
  static void track(String event, [Map<String, Object>? properties]) {
    if (!_initialized) return;
    Posthog().capture(eventName: event, properties: properties);
  }

  /// Identify a user after login.
  static void identify(String userId, [Map<String, Object>? traits]) {
    if (!_initialized) return;
    Posthog().identify(userId: userId, userProperties: traits);
  }

  /// Reset analytics on logout.
  static void reset() {
    if (!_initialized) return;
    Posthog().reset();
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
