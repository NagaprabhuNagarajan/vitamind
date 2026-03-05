import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/material.dart';

import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/register_screen.dart';
import '../../features/auth/presentation/screens/forgot_password_screen.dart';
import '../../features/auth/presentation/screens/verify_email_screen.dart';
import '../../features/dashboard/presentation/screens/dashboard_screen.dart';
import '../../features/tasks/presentation/screens/tasks_screen.dart';
import '../../features/goals/presentation/screens/goals_screen.dart';
import '../../features/habits/presentation/screens/habits_screen.dart';
import '../../features/planner/presentation/screens/planner_screen.dart';
import '../../features/ai/presentation/screens/ai_screen.dart';
import '../../features/settings/presentation/screens/settings_screen.dart';

class Routes {
  static const splash = '/';
  static const login = '/login';
  static const register = '/register';
  static const forgotPassword = '/forgot-password';
  static const dashboard = '/dashboard';
  static const tasks = '/tasks';
  static const goals = '/goals';
  static const habits = '/habits';
  static const planner = '/planner';
  static const ai = '/ai';
  static const verifyEmail = '/verify-email';
  static const profile = '/profile';
  static const settings = '/settings';
}

class AppRouter {
  /// Global navigator key exposed so services without BuildContext (e.g.
  /// NotificationService) can access the overlay to show in-app banners.
  static final navigatorKey = GlobalKey<NavigatorState>();

  static final router = GoRouter(
    navigatorKey: navigatorKey,
    initialLocation: Routes.splash,
    redirect: (context, state) {
      final session = Supabase.instance.client.auth.currentSession;
      final isAuth = session != null;
      final isAuthRoute = state.matchedLocation == Routes.login ||
          state.matchedLocation == Routes.register ||
          state.matchedLocation == Routes.forgotPassword ||
          state.matchedLocation == Routes.verifyEmail;

      if (!isAuth && !isAuthRoute && state.matchedLocation != Routes.splash) {
        return Routes.login;
      }
      if (isAuth && isAuthRoute) {
        return Routes.dashboard;
      }
      return null;
    },
    routes: [
      GoRoute(path: Routes.splash, builder: (_, __) => const _SplashScreen()),
      GoRoute(path: Routes.login, builder: (_, __) => const LoginScreen()),
      GoRoute(path: Routes.register, builder: (_, __) => const RegisterScreen()),
      GoRoute(path: Routes.forgotPassword, builder: (_, __) => const ForgotPasswordScreen()),
      GoRoute(
        path: Routes.verifyEmail,
        builder: (_, state) {
          final email = state.uri.queryParameters['email'] ?? '';
          return VerifyEmailScreen(email: email);
        },
      ),
      GoRoute(path: Routes.dashboard, builder: (_, __) => const DashboardScreen()),
      GoRoute(path: Routes.tasks, builder: (_, __) => const TasksScreen()),
      GoRoute(path: Routes.goals, builder: (_, __) => const GoalsScreen()),
      GoRoute(path: Routes.habits, builder: (_, __) => const HabitsScreen()),
      GoRoute(path: Routes.planner, builder: (_, __) => const PlannerScreen()),
      GoRoute(path: Routes.ai, builder: (_, __) => const AiScreen()),
      GoRoute(path: Routes.settings, builder: (_, __) => const SettingsScreen()),
    ],
  );
}

class _SplashScreen extends StatefulWidget {
  const _SplashScreen();

  @override
  State<_SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<_SplashScreen> {
  @override
  void initState() {
    super.initState();
    _redirect();
  }

  Future<void> _redirect() async {
    await Future.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;
    final session = Supabase.instance.client.auth.currentSession;
    if (session != null) {
      context.go(Routes.dashboard);
    } else {
      context.go(Routes.login);
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFF060810),
      body: Center(
        child: CircularProgressIndicator(
          color: Color(0xFF6366F1),
          strokeWidth: 2,
        ),
      ),
    );
  }
}
