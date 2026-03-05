import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../ai/data/ai_service.dart';

class PlannerScreen extends StatefulWidget {
  const PlannerScreen({super.key});

  @override
  State<PlannerScreen> createState() => _PlannerScreenState();
}

class _PlannerScreenState extends State<PlannerScreen> {
  final _service = AiService();
  String? _plan;
  bool _cached = false;
  bool _loading = false;
  String? _error;

  Future<void> _generate({bool force = false}) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await _service.fetchDailyPlan(force: force);
      setState(() {
        _plan = result.plan;
        _cached = result.cached;
      });
    } catch (e) {
      setState(() => _error = 'Failed to generate plan. Please try again.');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const GradientText(
          'AI Planner',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        leading: BackButton(
          color: AppColors.textSecondary,
          onPressed: () => context.go(Routes.dashboard),
        ),
        actions: [
          if (_plan != null)
            IconButton(
              icon: _loading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          color: AppColors.secondary, strokeWidth: 2),
                    )
                  : const Icon(Icons.refresh_rounded,
                      size: 20, color: AppColors.secondary),
              onPressed: _loading ? null : () => _generate(force: true),
              tooltip: 'Regenerate',
            ),
          const SizedBox(width: 4),
        ],
      ),
      body: _plan == null ? _buildEmpty() : _buildPlan(),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.secondary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
                border: Border.all(
                    color: AppColors.secondary.withValues(alpha: 0.25)),
              ),
              child: const Icon(Icons.auto_awesome_outlined,
                  color: AppColors.secondary, size: 32),
            ),
            const SizedBox(height: 20),
            Text(
              'Generate your daily plan',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'VitaMind will analyse your tasks, goals, and habits to build a focused plan for today.',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!,
                  style: const TextStyle(
                      color: AppColors.error, fontSize: 13),
                  textAlign: TextAlign.center),
            ],
            const SizedBox(height: 24),
            GradientButton(
              label: _loading ? 'Generating…' : 'Generate plan',
              loading: _loading,
              onPressed: _loading ? null : () => _generate(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlan() {
    return RefreshIndicator(
      onRefresh: () => _generate(force: true),
      color: AppColors.secondary,
      backgroundColor: AppColors.surface,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          // Header row
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppColors.secondary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.auto_awesome_outlined,
                    size: 14, color: AppColors.secondary),
              ),
              const SizedBox(width: 8),
              Text(
                "Today's Plan",
                style: Theme.of(context)
                    .textTheme
                    .labelLarge
                    ?.copyWith(color: AppColors.secondary),
              ),
              if (_cached) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceEl,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: const Text('cached',
                      style: TextStyle(
                          fontSize: 10, color: AppColors.textTertiary)),
                ),
              ],
            ],
          ),
          const SizedBox(height: 12),

          // Plan content
          GlassCard(
            padding: const EdgeInsets.all(16),
            borderColor: AppColors.secondary.withValues(alpha: 0.2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: _renderPlan(_plan!),
            ),
          ),

          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!,
                style: const TextStyle(
                    color: AppColors.error, fontSize: 13),
                textAlign: TextAlign.center),
          ],
        ],
      ),
    );
  }

  List<Widget> _renderPlan(String text) {
    final widgets = <Widget>[];
    bool first = true;
    for (final line in text.split('\n')) {
      if (line.startsWith('## ')) {
        if (!first) widgets.add(const SizedBox(height: 16));
        widgets.add(Text(
          line.replaceFirst('## ', ''),
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.secondary,
          ),
        ));
        widgets.add(const SizedBox(height: 6));
        first = false;
      } else if (line.trim().isEmpty) {
        if (widgets.isNotEmpty) widgets.add(const SizedBox(height: 4));
      } else {
        widgets.add(Text(
          line,
          style: const TextStyle(
            fontSize: 14,
            color: AppColors.textPrimary,
            height: 1.6,
          ),
        ));
        first = false;
      }
    }
    return widgets;
  }
}
