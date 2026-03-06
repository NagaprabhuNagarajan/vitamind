import 'package:flutter/foundation.dart';

/// Sentry error monitoring service.
///
/// Wraps the Sentry SDK so the app can report errors to Sentry in production.
/// To enable: add `sentry_flutter: ^8.3.0` to pubspec.yaml and uncomment
/// the import + initialization below.
///
/// Usage in main.dart:
///   await SentryService.init(dsn: dotenv.env['SENTRY_DSN'] ?? '');
///   // Then wrap runApp:
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

    // TODO: Uncomment when sentry_flutter is added to pubspec.yaml:
    // await SentryFlutter.init(
    //   (options) {
    //     options.dsn = dsn;
    //     options.tracesSampleRate = 0.1;
    //     options.environment = kReleaseMode ? 'production' : 'development';
    //   },
    // );
    _initialized = true;
    debugPrint('[SentryService] Initialized');
  }

  /// Capture an exception and send to Sentry.
  static void captureException(Object exception, {StackTrace? stackTrace}) {
    if (!_initialized) return;
    // TODO: Uncomment when sentry_flutter is added:
    // Sentry.captureException(exception, stackTrace: stackTrace);
    debugPrint('[SentryService] Captured: $exception');
  }

  /// Run the app inside Sentry's error zone.
  static Future<void> runGuarded(void Function() appRunner) async {
    // TODO: Uncomment when sentry_flutter is added:
    // if (_initialized) {
    //   await SentryFlutter.init(...);  // Already called in init()
    //   appRunner();
    // } else {
    //   appRunner();
    // }
    appRunner();
  }
}
