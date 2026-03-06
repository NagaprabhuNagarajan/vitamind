import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../data/goal_autopilot_service.dart';

class GoalAutopilotScreen extends StatefulWidget {
  const GoalAutopilotScreen({super.key});

  @override
  State<GoalAutopilotScreen> createState() => _GoalAutopilotScreenState();
}

class _GoalAutopilotScreenState extends State<GoalAutopilotScreen> {
  final _service = GoalAutopilotService();
  List<Map<String, dynamic>> _goals = [];
  List<GoalPlan> _plans = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final userId = Supabase.instance.client.auth.currentUser!.id;
    try {
      final goals = await _service.getAutopilotGoals(userId);
      final plans = await _service.fetchPlans(userId);
      setState(() {
        _goals = goals;
        _plans = plans;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _toggleAutopilot(String goalId, bool enabled) async {
    await _service.toggleAutopilot(goalId, enabled);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Goal Autopilot'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _buildBody(),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }

  Widget _buildBody() {
    if (_goals.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.rocket_launch_outlined, size: 48, color: AppColors.textTertiary.withValues(alpha: 0.5)),
              const SizedBox(height: 16),
              Text('No goals with autopilot', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Text(
                'Enable autopilot on your goals to let AI generate and adjust tasks weekly.',
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Autopilot Goals', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        ..._goals.map((goal) {
          final autopilotEnabled = goal['autopilot_enabled'] as bool? ?? false;
          final progress = (goal['progress'] as num?)?.toInt() ?? 0;

          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: GlassCard(
              borderColor: autopilotEnabled
                  ? AppColors.primary.withValues(alpha: 0.3)
                  : AppColors.border,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          goal['title'] as String? ?? 'Goal',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                      Switch(
                        value: autopilotEnabled,
                        onChanged: (v) => _toggleAutopilot(goal['id'] as String, v),
                        activeTrackColor: AppColors.primary.withValues(alpha: 0.5),
                        activeThumbColor: AppColors.primary,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: progress / 100,
                      backgroundColor: AppColors.border,
                      color: AppColors.primary,
                      minHeight: 6,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text('$progress% complete', style: Theme.of(context).textTheme.labelSmall),
                ],
              ),
            ),
          );
        }),

        if (_plans.isNotEmpty) ...[
          const SizedBox(height: 20),
          Text('Recent Plans', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          ..._plans.take(5).map((plan) {
            final taskCount = (plan.tasks).length;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: GlassCard(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.secondary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.auto_fix_high, size: 18, color: AppColors.secondary),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Week ${plan.weekNumber}', style: Theme.of(context).textTheme.labelLarge),
                          Text('$taskCount tasks generated', style: Theme.of(context).textTheme.bodyMedium),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ],
    );
  }
}
