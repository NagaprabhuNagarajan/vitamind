import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/cascade_service.dart';

/// Cascade Intelligence screen -- surfaces alerts when missed habits
/// ripple into goal delays, helping users see the hidden cost of skipping.
class CascadeScreen extends StatefulWidget {
  const CascadeScreen({super.key});

  @override
  State<CascadeScreen> createState() => _CascadeScreenState();
}

class _CascadeScreenState extends State<CascadeScreen> {
  final _service = CascadeService();

  late final String _userId;

  bool _isLoading = true;
  List<CascadeEvent> _alerts = [];
  List<HabitGoalLink> _links = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _userId = Supabase.instance.client.auth.currentUser!.id;
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _service.fetchCascades(_userId),
        _service.fetchLinks(_userId),
      ]);
      if (!mounted) return;
      setState(() {
        _alerts = results[0] as List<CascadeEvent>;
        _links = results[1] as List<HabitGoalLink>;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load cascade data.';
        _isLoading = false;
      });
    }
  }

  Future<void> _acknowledgeAlert(CascadeEvent alert) async {
    // Optimistic removal
    setState(() => _alerts.removeWhere((a) => a.id == alert.id));

    try {
      await _service.acknowledge(alert.id);
    } catch (_) {
      // Revert on failure
      if (!mounted) return;
      setState(() => _alerts.insert(0, alert));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not acknowledge alert.')),
      );
    }
  }

  Future<void> _deleteLink(HabitGoalLink link) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove link?'),
        content: const Text(
          'This habit will no longer be tracked against the linked goal.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Remove',
                style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _links.removeWhere((l) => l.id == link.id));

    try {
      await _service.unlinkHabitFromGoal(link.id);
    } catch (_) {
      if (!mounted) return;
      setState(() => _links.add(link));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Cascade Intelligence'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            color: AppColors.textSecondary,
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.accent))
          : _error != null
              ? _buildError()
              : RefreshIndicator(
                  onRefresh: _loadData,
                  color: AppColors.accent,
                  backgroundColor: AppColors.surface,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    children: [
                      _buildAlertsSection(),
                      const SizedBox(height: 24),
                      _buildLinksSection(),
                    ],
                  ),
                ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.warning_amber_rounded,
              size: 40, color: AppColors.warning),
          const SizedBox(height: 12),
          Text(_error!, style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 16),
          OutlinedButton(onPressed: _loadData, child: const Text('Retry')),
        ],
      ),
    );
  }

  // -- Cascade Alerts --------------------------------------------------------

  Widget _buildAlertsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.warning_amber_rounded,
                  size: 16, color: AppColors.warning),
            ),
            const SizedBox(width: 8),
            Text('Active alerts',
                style: Theme.of(context).textTheme.titleMedium),
            const Spacer(),
            if (_alerts.isNotEmpty)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${_alerts.length}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.error,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        if (_alerts.isEmpty)
          GlassCard(
            padding: const EdgeInsets.all(24),
            child: Center(
              child: Column(
                children: [
                  Icon(Icons.check_circle_outline,
                      size: 32,
                      color: AppColors.success.withValues(alpha: 0.7)),
                  const SizedBox(height: 8),
                  Text(
                    'No cascade alerts. Your habits are on track.',
                    style: Theme.of(context).textTheme.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          )
        else
          ..._alerts.map(_buildAlertCard),
      ],
    );
  }

  Widget _buildAlertCard(CascadeEvent alert) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: GlassCard(
        padding: const EdgeInsets.all(16),
        borderColor: AppColors.warning.withValues(alpha: 0.3),
        color: AppColors.warning.withValues(alpha: 0.04),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Habit that was missed
            Row(
              children: [
                const Icon(Icons.loop_rounded,
                    size: 14, color: AppColors.warning),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    alert.habitTitle.isNotEmpty ? alert.habitTitle : 'Missed habit',
                    style: Theme.of(context).textTheme.labelLarge,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            if (alert.affectedGoals.isNotEmpty) ...[
              const SizedBox(height: 10),
              // Affected goals
              ...alert.affectedGoals.map((g) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  children: [
                    const Icon(Icons.flag_rounded,
                        size: 14, color: AppColors.secondary),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Affects: ${g['title'] ?? g['goal_id'] ?? 'Goal'}',
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              )),
            ],
            // AI suggestion if present
            if (alert.suggestion != null && alert.suggestion!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.auto_awesome,
                        size: 14, color: AppColors.primary),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        alert.suggestion!,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _acknowledgeAlert(alert),
                icon: const Icon(Icons.check_rounded, size: 16),
                label: const Text('Acknowledge'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.accent,
                  side: BorderSide(
                    color: AppColors.accent.withValues(alpha: 0.3),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // -- Habit-Goal Links ------------------------------------------------------

  Widget _buildLinksSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.secondary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.link_rounded,
                  size: 16, color: AppColors.secondary),
            ),
            const SizedBox(width: 8),
            Text('Habit-Goal links',
                style: Theme.of(context).textTheme.titleMedium),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'Habits linked to goals for cascade tracking.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 12),
        if (_links.isEmpty)
          GlassCard(
            padding: const EdgeInsets.all(24),
            child: Center(
              child: Text(
                'No habit-goal links configured yet.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
          )
        else
          ..._links.map((link) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: GlassCard(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  child: Row(
                    children: [
                      const Icon(Icons.loop_rounded,
                          size: 14, color: AppColors.accent),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Habit ${link.habitId.substring(0, 8)}...',
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textPrimary,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const Icon(Icons.arrow_forward_rounded,
                          size: 14, color: AppColors.textTertiary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Goal ${link.goalId.substring(0, 8)}...',
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textPrimary,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 4),
                      // Weight badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '${link.impactWeight.toStringAsFixed(1)}x',
                          style: const TextStyle(
                            fontSize: 10,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 4),
                      GestureDetector(
                        onTap: () => _deleteLink(link),
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: AppColors.error.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Icon(Icons.close,
                              size: 12, color: AppColors.textTertiary),
                        ),
                      ),
                    ],
                  ),
                ),
              )),
      ],
    );
  }
}
