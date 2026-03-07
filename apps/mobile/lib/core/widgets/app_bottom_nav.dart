import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../router/app_router.dart';
import '../theme/app_theme.dart';

class AppBottomNav extends StatelessWidget {
  final int currentIndex;
  const AppBottomNav({super.key, required this.currentIndex});

  void _showMoreSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.75,
      ),
      builder: (_) => _MoreBottomSheet(parentContext: context),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(
          top: BorderSide(color: AppColors.border),
        ),
      ),
      child: NavigationBar(
        selectedIndex: currentIndex.clamp(0, 4),
        onDestinationSelected: (i) {
          switch (i) {
            case 0:
              context.go(Routes.dashboard);
            case 1:
              context.go(Routes.tasks);
            case 2:
              context.go(Routes.habits);
            case 3:
              context.go(Routes.goals);
            case 4:
              _showMoreSheet(context);
          }
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.task_alt_outlined),
            selectedIcon: Icon(Icons.task_alt_rounded),
            label: 'Tasks',
          ),
          NavigationDestination(
            icon: Icon(Icons.loop_outlined),
            selectedIcon: Icon(Icons.loop_rounded),
            label: 'Habits',
          ),
          NavigationDestination(
            icon: Icon(Icons.flag_outlined),
            selectedIcon: Icon(Icons.flag_rounded),
            label: 'Goals',
          ),
          NavigationDestination(
            icon: Icon(Icons.more_horiz_rounded),
            selectedIcon: Icon(Icons.more_horiz_rounded),
            label: 'More',
          ),
        ],
      ),
    );
  }
}

/// Bottom sheet shown when the "More" tab is tapped.  Provides access to
/// AI Assistant, Planner, and Settings — features that were moved out of
/// the main navigation bar to keep it uncluttered at five items max.
class _MoreBottomSheet extends StatelessWidget {
  final BuildContext parentContext;
  const _MoreBottomSheet({required this.parentContext});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(
          top: BorderSide(color: AppColors.border),
          left: BorderSide(color: AppColors.border),
          right: BorderSide(color: AppColors.border),
        ),
      ),
      child: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Drag handle
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.textTertiary.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              _MoreTile(
                icon: Icons.speed_outlined,
                label: 'Momentum',
                subtitle: 'Life momentum score',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.momentum);
                },
              ),
              _MoreTile(
                icon: Icons.timeline_outlined,
                label: 'Life Timeline',
                subtitle: 'Your life story, event by event',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.timeline);
                },
              ),
              _MoreTile(
                icon: Icons.hexagon_outlined,
                label: 'Life Map',
                subtitle: 'Holistic view of your life domains',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.lifeMap);
                },
              ),
              _MoreTile(
                icon: Icons.center_focus_strong_outlined,
                label: 'Focus Mode',
                subtitle: 'AI-guided deep work sessions',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.focus);
                },
              ),
              _MoreTile(
                icon: Icons.mic_outlined,
                label: 'Voice Log',
                subtitle: 'Speak to log your day',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.voiceLog);
                },
              ),
              _MoreTile(
                icon: Icons.auto_graph_outlined,
                label: 'Patterns',
                subtitle: 'Discover hidden correlations',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.patterns);
                },
              ),
              _MoreTile(
                icon: Icons.menu_book_outlined,
                label: 'Reviews',
                subtitle: 'Monthly life reviews',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.reviews);
                },
              ),
              _MoreTile(
                icon: Icons.shield_outlined,
                label: 'Burnout Radar',
                subtitle: 'Early burnout detection',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.burnout);
                },
              ),
              _MoreTile(
                icon: Icons.account_tree_outlined,
                label: 'Cascades',
                subtitle: 'Habit-goal ripple effects',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.cascade);
                },
              ),
              _MoreTile(
                icon: Icons.stacked_bar_chart_outlined,
                label: 'Habit Stacks',
                subtitle: 'Chain habits together',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.habitStacks);
                },
              ),
              _MoreTile(
                icon: Icons.rocket_launch_outlined,
                label: 'Goal Autopilot',
                subtitle: 'AI-managed goal plans',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.goalAutopilot);
                },
              ),
              _MoreTile(
                icon: Icons.handshake_outlined,
                label: 'Contracts',
                subtitle: 'Accountability with stakes',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.contracts);
                },
              ),
              _MoreTile(
                icon: Icons.fingerprint_outlined,
                label: 'Time Fingerprint',
                subtitle: 'Your productivity profile',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.timeFingerprint);
                },
              ),
              _MoreTile(
                icon: Icons.auto_awesome_outlined,
                label: 'AI Assistant',
                subtitle: 'Chat with your life coach',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.ai);
                },
              ),
              _MoreTile(
                icon: Icons.psychology_outlined,
                label: 'Life Coach',
                subtitle: 'Proactive AI coaching insights',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.lifeCoach);
                },
              ),
              _MoreTile(
                icon: Icons.favorite_outlined,
                label: 'Life Companion',
                subtitle: 'Your warm, emotionally intelligent AI',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.companion);
                },
              ),
              _MoreTile(
                icon: Icons.balance_outlined,
                label: 'Decision Engine',
                subtitle: 'AI-powered decision analysis',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.decisions);
                },
              ),
              _MoreTile(
                icon: Icons.science_outlined,
                label: 'Life Simulation',
                subtitle: 'Simulate your future scenarios',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.lifeSimulation);
                },
              ),
              _MoreTile(
                icon: Icons.hub_outlined,
                label: 'Knowledge Graph',
                subtitle: 'See how your habits influence outcomes',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.knowledgeGraph);
                },
              ),
              _MoreTile(
                icon: Icons.bolt_outlined,
                label: 'Auto Capture',
                subtitle: 'Quick-log anything in plain English',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.autoCapture);
                },
              ),
              _MoreTile(
                icon: Icons.calendar_today_outlined,
                label: 'Planner',
                subtitle: 'AI-generated daily plan',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.planner);
                },
              ),
              _MoreTile(
                icon: Icons.settings_outlined,
                label: 'Settings',
                subtitle: 'Profile, account, preferences',
                onTap: () {
                  Navigator.of(context).pop();
                  parentContext.go(Routes.settings);
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}

/// A single row inside the "More" bottom sheet.
class _MoreTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;

  const _MoreTile({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: '$label: $subtitle',
      child: InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 20, color: AppColors.primary),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textTertiary,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              size: 20,
              color: AppColors.textTertiary,
              semanticLabel: 'Navigate',
            ),
          ],
        ),
      ),
    ),
    );
  }
}
