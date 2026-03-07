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
import '../../features/momentum/presentation/screens/momentum_screen.dart';
import '../../features/burnout/presentation/screens/burnout_screen.dart';
import '../../features/patterns/presentation/screens/patterns_screen.dart';
import '../../features/life_review/presentation/screens/reviews_screen.dart';
import '../../features/focus/presentation/screens/focus_screen.dart';
import '../../features/voice_log/presentation/screens/voice_log_screen.dart';
import '../../features/cascade/presentation/screens/cascade_screen.dart';
import '../../features/habit_stacking/presentation/screens/habit_stacks_screen.dart';
import '../../features/goal_autopilot/presentation/screens/goal_autopilot_screen.dart';
import '../../features/accountability/presentation/screens/contracts_screen.dart';
import '../../features/time_fingerprint/presentation/screens/time_fingerprint_screen.dart';
import '../../features/timeline/presentation/screens/timeline_screen.dart';
import '../../features/life_map/presentation/screens/life_map_screen.dart';
import '../../features/life_coach/presentation/screens/life_coach_screen.dart';
import '../../features/companion/presentation/screens/companion_screen.dart';
import '../../features/decisions/presentation/screens/decisions_screen.dart';
import '../../features/life_simulation/presentation/screens/life_simulation_screen.dart';
import '../../features/knowledge_graph/presentation/screens/knowledge_graph_screen.dart';
import '../../features/auto_capture/presentation/screens/auto_capture_screen.dart';

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
  static const momentum = '/momentum';
  static const burnout = '/burnout';
  static const patterns = '/patterns';
  static const reviews = '/reviews';
  static const focus = '/focus';
  static const voiceLog = '/voice-log';
  static const cascade = '/cascade';
  static const habitStacks = '/habit-stacks';
  static const goalAutopilot = '/goal-autopilot';
  static const contracts = '/contracts';
  static const timeFingerprint = '/time-fingerprint';
  static const timeline = '/timeline';
  static const lifeMap = '/life-map';
  static const lifeCoach = '/life-coach';
  static const companion = '/companion';
  static const decisions = '/decisions';
  static const lifeSimulation = '/life-simulation';
  static const knowledgeGraph = '/knowledge-graph';
  static const autoCapture = '/auto-capture';
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
      GoRoute(path: Routes.momentum, builder: (_, __) => const MomentumScreen()),
      GoRoute(path: Routes.burnout, builder: (_, __) => const BurnoutScreen()),
      GoRoute(path: Routes.patterns, builder: (_, __) => const PatternsScreen()),
      GoRoute(path: Routes.reviews, builder: (_, __) => const ReviewsScreen()),
      GoRoute(path: Routes.focus, builder: (_, __) => const FocusScreen()),
      GoRoute(path: Routes.voiceLog, builder: (_, __) => const VoiceLogScreen()),
      GoRoute(path: Routes.cascade, builder: (_, __) => const CascadeScreen()),
      GoRoute(path: Routes.habitStacks, builder: (_, __) => const HabitStacksScreen()),
      GoRoute(path: Routes.goalAutopilot, builder: (_, __) => const GoalAutopilotScreen()),
      GoRoute(path: Routes.contracts, builder: (_, __) => const ContractsScreen()),
      GoRoute(path: Routes.timeFingerprint, builder: (_, __) => const TimeFingerprintScreen()),
      GoRoute(path: Routes.timeline, builder: (_, __) => const TimelineScreen()),
      GoRoute(path: Routes.lifeMap, builder: (_, __) => const LifeMapScreen()),
      GoRoute(path: Routes.lifeCoach, builder: (_, __) => const LifeCoachScreen()),
      GoRoute(path: Routes.companion, builder: (_, __) => const CompanionScreen()),
      GoRoute(path: Routes.decisions, builder: (_, __) => const DecisionsScreen()),
      GoRoute(path: Routes.lifeSimulation, builder: (_, __) => const LifeSimulationScreen()),
      GoRoute(path: Routes.knowledgeGraph, builder: (_, __) => const KnowledgeGraphScreen()),
      GoRoute(path: Routes.autoCapture, builder: (_, __) => const AutoCaptureScreen()),
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
