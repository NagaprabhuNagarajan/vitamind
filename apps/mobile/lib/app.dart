import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/notifications/notification_service.dart';
import 'features/auth/data/auth_service.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';

class VitaMindApp extends StatelessWidget {
  const VitaMindApp({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => AuthBloc(AuthService())..add(AuthStarted()),
      child: BlocListener<AuthBloc, AuthState>(
        listenWhen: (prev, curr) => curr is AuthAuthenticated && prev is! AuthAuthenticated,
        listener: (_, __) => NotificationService().init().catchError(
              (e) => debugPrint('Notifications init failed: $e'),
            ),
        child: MaterialApp.router(
          title: 'VitaMind',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.dark,
          darkTheme: AppTheme.dark,
          themeMode: ThemeMode.dark,
          routerConfig: AppRouter.router,
        ),
      ),
    );
  }
}
