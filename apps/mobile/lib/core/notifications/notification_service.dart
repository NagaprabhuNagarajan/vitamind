import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../router/app_router.dart';
import '../widgets/in_app_banner.dart';

/// Handles FCM token registration and foreground/background message routing.
class NotificationService {
  static final NotificationService _instance = NotificationService._();
  factory NotificationService() => _instance;
  NotificationService._();

  /// Tracks the currently visible banner overlay so we can remove it before
  /// showing a new one (prevents stacking).
  OverlayEntry? _activeBanner;

  /// Call once after Firebase.initializeApp() and user is authenticated.
  Future<void> init() async {
    // Access FirebaseMessaging.instance lazily — it throws if Firebase hasn't
    // been initialized (e.g. google-services.json is missing in dev).
    late final FirebaseMessaging fcm;
    try {
      fcm = FirebaseMessaging.instance;
    } catch (e) {
      debugPrint('NotificationService: Firebase not initialized, skipping — $e');
      return;
    }
    // Request permission (iOS + Android 13+)
    final settings = await fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    if (settings.authorizationStatus == AuthorizationStatus.denied) return;

    // Register the FCM token with our backend so we can send targeted pushes
    final token = await fcm.getToken();
    if (token != null) await _saveToken(token);

    // Refresh token when it rotates
    fcm.onTokenRefresh.listen(_saveToken);

    // Foreground messages
    FirebaseMessaging.onMessage.listen(_handleForeground);

    // Message tap while app is in background (not terminated)
    FirebaseMessaging.onMessageOpenedApp.listen(_handleTap);

    // Message tap when app was terminated
    final initial = await fcm.getInitialMessage();
    if (initial != null) _handleTap(initial);
  }

  /// Saves the FCM token to the `users` table so the server can target it.
  Future<void> _saveToken(String token) async {
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) return;
    try {
      await Supabase.instance.client
          .from('users')
          .update({'fcm_token': token})
          .eq('id', userId);
    } catch (e) {
      debugPrint('NotificationService: failed to save token — $e');
    }
  }

  /// Shows an animated in-app banner when a push arrives while the app is in
  /// the foreground. Tapping the banner navigates to the relevant screen.
  void _handleForeground(RemoteMessage message) {
    final title = message.notification?.title ?? '';
    final body = message.notification?.body ?? '';
    final type = message.data['type'] as String?;

    debugPrint('FCM foreground: $title');

    if (title.isEmpty && body.isEmpty) return;

    _showBanner(title: title, body: body, type: type, message: message);
  }

  /// Inserts an [InAppNotificationBanner] into the navigator overlay.
  void _showBanner({
    required String title,
    required String body,
    String? type,
    required RemoteMessage message,
  }) {
    // Dismiss any existing banner to avoid stacking
    _removeBanner();

    final overlay = AppRouter.navigatorKey.currentState?.overlay;
    if (overlay == null) {
      debugPrint('NotificationService: no overlay available for banner');
      return;
    }

    late final OverlayEntry entry;
    entry = OverlayEntry(
      builder: (context) => InAppNotificationBanner(
        title: title,
        body: body,
        type: type,
        onTap: () {
          _removeBanner();
          _handleTap(message);
        },
        onDismissed: () => _removeBanner(),
      ),
    );

    _activeBanner = entry;
    overlay.insert(entry);
  }

  /// Safely removes the currently visible banner from the overlay.
  void _removeBanner() {
    _activeBanner?.remove();
    _activeBanner = null;
  }

  void _handleTap(RemoteMessage message) {
    final data = message.data;
    debugPrint('FCM tap: type=${data['type']} id=${data['id']}');

    final type = data['type'] as String?;
    switch (type) {
      case 'tasks':
        AppRouter.router.go(Routes.tasks);
      case 'habits':
        AppRouter.router.go(Routes.habits);
      default:
        AppRouter.router.go(Routes.dashboard);
    }
  }
}

// Top-level handler required by FCM for background/terminated messages.
// Must be registered with FirebaseMessaging.onBackgroundMessage().
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('FCM background: ${message.notification?.title}');
}
