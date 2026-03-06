import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../patterns/data/patterns_service.dart';

/// Shows AI-discovered behavioral patterns -- correlations, day-of-week
/// effects, keystone habits, and other insights derived from user data.
class PatternsScreen extends StatefulWidget {
  const PatternsScreen({super.key});

  @override
  State<PatternsScreen> createState() => _PatternsScreenState();
}

class _PatternsScreenState extends State<PatternsScreen> {
  final _service = PatternsService();

  PatternInsight? _keystone;
  List<PatternInsight> _insights = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final userId = Supabase.instance.client.auth.currentUser!.id;
      final results = await Future.wait([
        _service.getKeystoneHabit(userId),
        _service.fetchInsights(userId),
      ]);

      if (!mounted) return;

      setState(() {
        _keystone = results[0] as PatternInsight?;
        _insights = results[1] as List<PatternInsight>;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _dismiss(PatternInsight insight) async {
    // Optimistic removal -- re-add on failure.
    setState(() => _insights.removeWhere((i) => i.id == insight.id));

    try {
      await _service.dismiss(insight.id);
    } catch (e) {
      if (!mounted) return;
      setState(() => _insights.add(insight));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to dismiss insight')),
      );
    }
  }

  IconData _typeIcon(String type) {
    switch (type) {
      case 'correlation':
        return Icons.link_outlined;
      case 'day_pattern':
        return Icons.calendar_today_outlined;
      case 'keystone_habit':
        return Icons.star_outline_rounded;
      case 'time_pattern':
        return Icons.schedule_outlined;
      case 'streak':
        return Icons.local_fire_department_outlined;
      default:
        return Icons.insights_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: const Text('Pattern Oracle'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined, size: 20),
            color: AppColors.textSecondary,
            tooltip: 'Refresh',
            onPressed: _load,
          ),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary))
          : _error != null
              ? _buildError()
              : _buildBody(),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, color: AppColors.error, size: 40),
          const SizedBox(height: 12),
          Text('Failed to load patterns',
              style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _load, child: const Text('Retry')),
        ],
      ),
    );
  }

  Widget _buildBody() {
    final hasData = _keystone != null || _insights.isNotEmpty;

    if (!hasData) return _buildEmpty();

    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      backgroundColor: AppColors.surface,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: [
          // -- Keystone habit highlight --
          if (_keystone != null) ...[
            _KeystoneCard(insight: _keystone!),
            const SizedBox(height: 20),
          ],

          // -- Pattern insight grid --
          if (_insights.isNotEmpty) ...[
            Text('Discovered Patterns',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            ..._insights.map((insight) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _InsightCard(
                    insight: insight,
                    icon: _typeIcon(insight.type),
                    onDismiss: () => _dismiss(insight),
                  ),
                )),
          ],

          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.psychology_outlined,
              size: 56,
              color: AppColors.textTertiary.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 16),
            Text(
              'Not enough data yet',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Keep logging tasks and habits for 30+ days so the Pattern Oracle can discover your behavioral trends.',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Private widgets
// ---------------------------------------------------------------------------

/// Highlighted card for the user's keystone habit -- the single habit whose
/// completion most strongly predicts overall productivity.
class _KeystoneCard extends StatelessWidget {
  final PatternInsight insight;
  const _KeystoneCard({required this.insight});

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      borderColor: AppColors.warning.withValues(alpha: 0.4),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.warning.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.star_rounded,
                color: AppColors.warning, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Keystone Habit',
                  style: Theme.of(context)
                      .textTheme
                      .labelSmall
                      ?.copyWith(color: AppColors.warning),
                ),
                const SizedBox(height: 2),
                Text(
                  insight.title,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  insight.description,
                  style: Theme.of(context).textTheme.bodyMedium,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Impact score badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.warning.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              '${(insight.confidence * 100).round()}%',
              style: Theme.of(context)
                  .textTheme
                  .labelLarge
                  ?.copyWith(color: AppColors.warning),
            ),
          ),
        ],
      ),
    );
  }
}

/// A single pattern insight card with type icon, confidence bar, and dismiss.
class _InsightCard extends StatelessWidget {
  final PatternInsight insight;
  final IconData icon;
  final VoidCallback onDismiss;

  const _InsightCard({
    required this.insight,
    required this.icon,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  insight.title,
                  style: Theme.of(context).textTheme.labelLarge,
                ),
              ),
              // Dismiss button
              Semantics(
                button: true,
                label: 'Dismiss insight',
                child: InkWell(
                  onTap: onDismiss,
                  borderRadius: BorderRadius.circular(16),
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: Icon(Icons.close_rounded,
                        size: 18, color: AppColors.textTertiary),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            insight.description,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 12),
          // Confidence bar
          Row(
            children: [
              Text(
                'Confidence',
                style: Theme.of(context)
                    .textTheme
                    .labelSmall
                    ?.copyWith(fontSize: 10),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: LinearProgressIndicator(
                    value: insight.confidence.clamp(0.0, 1.0),
                    minHeight: 4,
                    backgroundColor: AppColors.border,
                    valueColor:
                        const AlwaysStoppedAnimation(AppColors.primary),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${(insight.confidence * 100).round()}%',
                style: Theme.of(context)
                    .textTheme
                    .labelSmall
                    ?.copyWith(fontSize: 10, color: AppColors.primary),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
