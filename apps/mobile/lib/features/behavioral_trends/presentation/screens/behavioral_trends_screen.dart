import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../data/behavioral_trends_service.dart';

class BehavioralTrendsScreen extends StatefulWidget {
  const BehavioralTrendsScreen({super.key});

  @override
  State<BehavioralTrendsScreen> createState() => _BehavioralTrendsScreenState();
}

class _BehavioralTrendsScreenState extends State<BehavioralTrendsScreen> {
  final _service = BehavioralTrendsService();

  BehavioralTrendsResult? _data;
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
      final result = await _service.fetchTrends();
      if (!mounted) return;
      setState(() {
        _data = result;
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

  Color _scoreColor(int score) {
    if (score >= 70) return AppColors.success;
    if (score >= 40) return AppColors.warning;
    return AppColors.error;
  }

  Color _trendColor(TrendDirection d) {
    switch (d) {
      case TrendDirection.improving:
        return AppColors.success;
      case TrendDirection.declining:
        return AppColors.error;
      case TrendDirection.stable:
        return AppColors.textTertiary;
    }
  }

  IconData _trendIcon(TrendDirection d) {
    switch (d) {
      case TrendDirection.improving:
        return Icons.trending_up_rounded;
      case TrendDirection.declining:
        return Icons.trending_down_rounded;
      case TrendDirection.stable:
        return Icons.trending_flat_rounded;
    }
  }

  String _trendLabel(TrendDirection d) {
    switch (d) {
      case TrendDirection.improving:
        return 'Improving';
      case TrendDirection.declining:
        return 'Declining';
      case TrendDirection.stable:
        return 'Stable';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: const Text('Behavioral Trends'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined, size: 20),
            color: AppColors.textSecondary,
            onPressed: _load,
          ),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary))
          : _error != null
              ? _buildError()
              : _data == null || !_data!.hasEnoughData
                  ? _buildEmpty()
                  : _buildBody(),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }

  Widget _buildError() => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: AppColors.error, size: 40),
            const SizedBox(height: 12),
            Text('Failed to load trends',
                style: Theme.of(context).textTheme.bodyLarge),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _load, child: const Text('Retry')),
          ],
        ),
      );

  Widget _buildEmpty() => Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.show_chart_rounded,
                  size: 56,
                  color: AppColors.textTertiary.withValues(alpha: 0.5)),
              const SizedBox(height: 16),
              Text('Not enough data yet',
                  style: Theme.of(context).textTheme.titleMedium,
                  textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(
                'VitaMind needs at least 7 days of data to show trends. Keep completing tasks and habits!',
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );

  Widget _buildBody() {
    final d = _data!;
    final trendColor = _trendColor(d.overallTrend);

    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      backgroundColor: AppColors.surface,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: [
          // ── Overall trend banner ──────────────────────────────────────
          GlassCard(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: trendColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: trendColor.withValues(alpha: 0.3), width: 1),
                  ),
                  child: Icon(_trendIcon(d.overallTrend),
                      color: trendColor, size: 22),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '90-Day Trend',
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: trendColor,
                              letterSpacing: 0.8,
                            ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${_trendLabel(d.overallTrend)} · ${d.overallDelta > 0 ? '+' : ''}${d.overallDelta} pts',
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                      ),
                      Text(
                        '${d.weeks.length} weeks analysed',
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(color: AppColors.textTertiary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // ── Weekly bar chart ──────────────────────────────────────────
          if (d.weeks.isNotEmpty) ...[
            Text('Weekly Scores',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            GlassCard(
              padding: const EdgeInsets.all(16),
              child: _WeekBarChart(weeks: d.weeks),
            ),
            const SizedBox(height: 16),
          ],

          // ── Component trends ──────────────────────────────────────────
          Text('Component Trends',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          GlassCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _ComponentTrendRow(
                  label: 'Task Velocity',
                  icon: Icons.bolt_rounded,
                  iconColor: AppColors.primary,
                  trend: d.componentTrends['task_velocity'] ??
                      const ComponentTrend(
                          direction: TrendDirection.stable, delta: 0),
                  trendColor: _trendColor,
                  trendIcon: _trendIcon,
                ),
                _ComponentTrendRow(
                  label: 'Habit Consistency',
                  icon: Icons.favorite_rounded,
                  iconColor: AppColors.accent,
                  trend: d.componentTrends['habit_consistency'] ??
                      const ComponentTrend(
                          direction: TrendDirection.stable, delta: 0),
                  trendColor: _trendColor,
                  trendIcon: _trendIcon,
                ),
                _ComponentTrendRow(
                  label: 'Goal Trajectory',
                  icon: Icons.track_changes_rounded,
                  iconColor: AppColors.secondary,
                  trend: d.componentTrends['goal_trajectory'] ??
                      const ComponentTrend(
                          direction: TrendDirection.stable, delta: 0),
                  trendColor: _trendColor,
                  trendIcon: _trendIcon,
                ),
                _ComponentTrendRow(
                  label: 'Burnout Risk',
                  icon: Icons.warning_amber_rounded,
                  iconColor: AppColors.warning,
                  trend: d.componentTrends['burnout_risk'] ??
                      const ComponentTrend(
                          direction: TrendDirection.stable, delta: 0),
                  trendColor: _trendColor,
                  trendIcon: _trendIcon,
                  isLast: true,
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // ── Best / Worst week ─────────────────────────────────────────
          if (d.bestWeek != null || d.worstWeek != null) ...[
            Text('Highlights',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            Row(
              children: [
                if (d.bestWeek != null)
                  Expanded(
                    child: _HighlightCard(
                      label: 'Best Week',
                      week: d.bestWeek!,
                      icon: Icons.emoji_events_rounded,
                      color: AppColors.success,
                    ),
                  ),
                if (d.bestWeek != null && d.worstWeek != null &&
                    d.bestWeek!.weekStart != d.worstWeek!.weekStart)
                  const SizedBox(width: 12),
                if (d.worstWeek != null &&
                    d.worstWeek!.weekStart != d.bestWeek?.weekStart)
                  Expanded(
                    child: _HighlightCard(
                      label: 'Hardest Week',
                      week: d.worstWeek!,
                      icon: Icons.schedule_rounded,
                      color: AppColors.error,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),
          ],

          // ── Weekly table ──────────────────────────────────────────────
          Text('Weekly Breakdown',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          GlassCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: d.weeks.reversed
                  .map((w) => _WeekRow(
                        week: w,
                        scoreColor: _scoreColor(w.avgScore),
                        isLast: w == d.weeks.first,
                      ))
                  .toList(),
            ),
          ),

          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

// ── Private widgets ──────────────────────────────────────────────────────────

class _WeekBarChart extends StatelessWidget {
  final List<WeekSummary> weeks;

  const _WeekBarChart({required this.weeks});

  Color _barColor(int score) {
    if (score >= 70) return AppColors.success;
    if (score >= 40) return AppColors.warning;
    return AppColors.error;
  }

  @override
  Widget build(BuildContext context) {
    final maxScore = weeks.map((w) => w.avgScore).reduce((a, b) => a > b ? a : b);

    return Column(
      children: [
        SizedBox(
          height: 80,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: weeks.map((w) {
              final pct = maxScore > 0 ? w.avgScore / maxScore : 0.0;
              final color = _barColor(w.avgScore);
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 1.5),
                  child: Tooltip(
                    message: '${w.weekLabel}\n${w.avgScore}/100',
                    child: Container(
                      height: (pct * 76).clamp(4.0, 76.0),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.75),
                        borderRadius: BorderRadius.circular(4),
                        boxShadow: [BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: 4)],
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              weeks.first.weekLabel.split(' – ').first,
              style: const TextStyle(fontSize: 10, color: AppColors.textTertiary),
            ),
            Text(
              weeks.last.weekLabel.split(' – ').last,
              style: const TextStyle(fontSize: 10, color: AppColors.textTertiary),
            ),
          ],
        ),
      ],
    );
  }
}

class _ComponentTrendRow extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color iconColor;
  final ComponentTrend trend;
  final Color Function(TrendDirection) trendColor;
  final IconData Function(TrendDirection) trendIcon;
  final bool isLast;

  const _ComponentTrendRow({
    required this.label,
    required this.icon,
    required this.iconColor,
    required this.trend,
    required this.trendColor,
    required this.trendIcon,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = trendColor(trend.direction);
    final deltaStr = trend.delta >= 0 ? '+${trend.delta}' : '${trend.delta}';

    return Padding(
      padding: EdgeInsets.only(bottom: isLast ? 0 : 14),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: iconColor, size: 16),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(label,
                style: Theme.of(context).textTheme.bodyMedium),
          ),
          Icon(trendIcon(trend.direction), color: color, size: 16),
          const SizedBox(width: 4),
          Text(
            '$deltaStr pts',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _HighlightCard extends StatelessWidget {
  final String label;
  final WeekSummary week;
  final IconData icon;
  final Color color;

  const _HighlightCard({
    required this.label,
    required this.week,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.2), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(icon, color: color, size: 14),
            const SizedBox(width: 4),
            Text(label,
                style: TextStyle(
                    fontSize: 11, fontWeight: FontWeight.w600, color: color)),
          ]),
          const SizedBox(height: 6),
          Text(week.weekLabel,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: AppColors.textSecondary)),
          const SizedBox(height: 2),
          Text('${week.avgScore}/100',
              style: TextStyle(
                  fontSize: 20, fontWeight: FontWeight.bold, color: color)),
          Text('${week.daysRecorded} days',
              style: const TextStyle(
                  fontSize: 10, color: AppColors.textTertiary)),
        ],
      ),
    );
  }
}

class _WeekRow extends StatelessWidget {
  final WeekSummary week;
  final Color scoreColor;
  final bool isLast;

  const _WeekRow({
    required this.week,
    required this.scoreColor,
    required this.isLast,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: isLast ? 0 : 12),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: Text(
              week.weekLabel,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: AppColors.textSecondary),
            ),
          ),
          _MiniStat(label: 'Score', value: week.avgScore, color: scoreColor),
          _MiniStat(label: 'Tasks', value: week.avgTaskVelocity),
          _MiniStat(label: 'Habits', value: week.avgHabitConsistency),
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final String label;
  final int value;
  final Color? color;

  const _MiniStat({required this.label, required this.value, this.color});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 52,
      child: Column(
        children: [
          Text(
            '$value',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: color ?? AppColors.textSecondary,
            ),
          ),
          Text(label,
              style:
                  const TextStyle(fontSize: 9, color: AppColors.textTertiary)),
        ],
      ),
    );
  }
}
