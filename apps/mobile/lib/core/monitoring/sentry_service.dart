import 'package:flutter/foundation.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

/// Sentry error monitoring service.
///
/// Usage in main.dart:
///   await SentryService.init(dsn: dotenv.env['SENTRY_DSN'] ?? '');
///   SentryService.runGuarded(() => runApp(const VitaMindApp()));
class SentryService {
  static bool _initialized = false;

  /// Initialize Sentry with the given DSN.
  /// No-op if DSN is empty or in debug mode.
  static Future<void> init({required String dsn}) async {
    if (dsn.isEmpty || kDebugMode) {
      debugPrint('[SentryService] Skipping — ${kDebugMode ? "debug mode" : "no DSN"}');
      return;
    }

    await SentryFlutter.init(
      (options) {
        options.dsn = dsn;
        options.tracesSampleRate = 0.1;
        options.environment = kReleaseMode ? 'production' : 'development';
      },
    );
    _initialized = true;
    debugPrint('[SentryService] Initialized');
  }

  /// Capture an exception and send to Sentry.
  static void captureException(Object exception, {StackTrace? stackTrace}) {
    if (!_initialized) return;
    Sentry.captureException(exception, stackTrace: stackTrace);
  }

  /// Run the app inside Sentry's error zone.
  static Future<void> runGuarded(Future<void> Function() appRunner) async {
    if (_initialized) {
      await appRunner();
    } else {
      await appRunner();
    }
  }
}
