import 'dart:ui';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import 'app.dart';
import 'core/analytics/analytics_service.dart';
import 'core/monitoring/sentry_service.dart';
import 'core/notifications/notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // In release mode, replace the red error screen with a user-friendly widget
  if (kReleaseMode) {
    ErrorWidget.builder = (FlutterErrorDetails details) {
      return const _AppErrorWidget();
    };
  }

  // Load environment variables (must be first — other inits read from dotenv)
  await dotenv.load(fileName: '.env');

  // Initialize Sentry (no-op in debug mode or if DSN is missing)
  await SentryService.init(dsn: dotenv.env['SENTRY_DSN'] ?? '');

  // Capture Flutter framework errors (layout, rendering, gestures)
  FlutterError.onError = (FlutterErrorDetails details) {
    SentryService.captureException(details.exception, stackTrace: details.stack);
    debugPrint('[VitaMind] Flutter error: ${details.exception}');
    debugPrint('[VitaMind] Stack trace:\n${details.stack}');
    if (kDebugMode) {
      FlutterError.presentError(details);
    }
  };

  // Capture async / platform errors not caught by Flutter framework
  PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
    SentryService.captureException(error, stackTrace: stack);
    debugPrint('[VitaMind] Uncaught platform error: $error');
    debugPrint('[VitaMind] Stack trace:\n$stack');
    return true;
  };

  // Initialize Firebase (optional — skipped if google-services.json is missing)
  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  } catch (e) {
    debugPrint('Firebase not configured, skipping: $e');
  }

  // Initialize Supabase
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
  );

  // Initialize PostHog analytics (no-op if key is empty)
  await AnalyticsService.init(
    apiKey: dotenv.env['POSTHOG_KEY'] ?? '',
    host: dotenv.env['POSTHOG_HOST'],
  );

  runApp(const VitaMindApp());
}

/// User-friendly error widget shown in release mode instead of the red error screen.
class _AppErrorWidget extends StatelessWidget {
  const _AppErrorWidget();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF060810),
      alignment: Alignment.center,
      padding: const EdgeInsets.all(32),
      child: const Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.error_outline_rounded, color: Color(0x99EF4444), size: 48),
          SizedBox(height: 16),
          Text(
            'Something went wrong',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w600,
              decoration: TextDecoration.none,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'Please restart the app.',
            style: TextStyle(
              color: Color(0x73FFFFFF),
              fontSize: 14,
              fontWeight: FontWeight.w400,
              decoration: TextDecoration.none,
            ),
          ),
        ],
      ),
    );
  }
}
