import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../momentum/data/momentum_service.dart';

/// Displays the user's Life Momentum Score -- a composite productivity metric
/// that synthesises task velocity, habit consistency, goal progress, and
/// overdue pressure into a single 0-100 number.
class MomentumScreen extends StatefulWidget {
  const MomentumScreen({super.key});

  @override
  State<MomentumScreen> createState() => _MomentumScreenState();
}

class _MomentumScreenState extends State<MomentumScreen>
    with SingleTickerProviderStateMixin {
  final _service = MomentumService();

  MomentumSnapshot? _current;
  List<MomentumSnapshot> _history = [];
  bool _loading = true;
  String? _error;

  late AnimationController _animCtrl;
  late Animation<double> _scoreAnim;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _scoreAnim = Tween<double>(begin: 0, end: 0).animate(
      CurvedAnimation(parent: _animCtrl, curve: Curves.easeOutCubic),
    );
    _load();
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final userId = Supabase.instance.client.auth.currentUser!.id;
      final results = await Future.wait([
        _service.fetchCurrent(userId),
        _service.fetchHistory(userId, days: 30),
      ]);

      final current = results[0] as MomentumSnapshot?;
      final history = results[1] as List<MomentumSnapshot>;

      if (!mounted) return;

      setState(() {
        _current = current;
        _history = history;
        _loading = false;
      });

      // Animate the score ring from 0 to the actual value.
      if (current != null) {
        _scoreAnim = Tween<double>(
          begin: 0,
          end: current.score.toDouble(),
        ).animate(
          CurvedAnimation(parent: _animCtrl, curve: Curves.easeOutCubic),
        );
        _animCtrl.forward(from: 0);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  // Score thresholds drive the ring color to give immediate visual feedback.
  Color _scoreColor(int score) {
    if (score > 70) return AppColors.success;
    if (score >= 40) return AppColors.warning;
    return AppColors.error;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: const Text('Life Momentum'),
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
              : _current == null
                  ? _buildEmpty()
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
          Text('Failed to load momentum',
              style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _load, child: const Text('Retry')),
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
            Icon(Icons.speed_outlined,
                size: 56, color: AppColors.textTertiary.withValues(alpha: 0.5)),
            const SizedBox(height: 16),
            Text(
              'No momentum data yet',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Complete tasks and habits to start tracking your life momentum score.',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    final snap = _current!;
    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      backgroundColor: AppColors.surface,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: [
          // -- Circular score display --
          _ScoreRing(
            animation: _scoreAnim,
            controller: _animCtrl,
            color: _scoreColor(snap.score),
          ),

          const SizedBox(height: 24),

          // -- Component breakdown --
          Text('Breakdown',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          ...snap.components.entries.map(
            (e) => _ComponentBar(
              label: _componentLabel(e.key),
              value: e.value,
              color: _componentColor(e.key),
            ),
          ),

          const SizedBox(height: 24),

          // -- History row --
          if (_history.isNotEmpty) ...[
            Text('Recent Scores',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            SizedBox(
              height: 72,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _history.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (_, i) {
                  final h = _history[i];
                  return _HistoryBadge(
                    score: h.score,
                    date: h.date,
                    color: _scoreColor(h.score),
                  );
                },
              ),
            ),
          ],

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  String _componentLabel(String key) {
    switch (key) {
      case 'task_velocity':
        return 'Task Velocity';
      case 'habit_consistency':
        return 'Habit Consistency';
      case 'goal_trajectory':
        return 'Goal Trajectory';
      case 'overdue_pressure':
        return 'Overdue Pressure';
      default:
        return key;
    }
  }

  Color _componentColor(String key) {
    switch (key) {
      case 'task_velocity':
        return AppColors.primary;
      case 'habit_consistency':
        return AppColors.accent;
      case 'goal_trajectory':
        return AppColors.secondary;
      case 'overdue_pressure':
        return AppColors.error;
      default:
        return AppColors.textTertiary;
    }
  }
}

// ---------------------------------------------------------------------------
// Private widgets
// ---------------------------------------------------------------------------

/// Animated circular ring that fills from 0 to the momentum score.
class _ScoreRing extends StatelessWidget {
  final Animation<double> animation;
  final AnimationController controller;
  final Color color;

  const _ScoreRing({
    required this.animation,
    required this.controller,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AnimatedBuilder(
        animation: controller,
        builder: (_, __) {
          final score = animation.value.round();
          return SizedBox(
            width: 180,
            height: 180,
            child: CustomPaint(
              painter: _RingPainter(
                progress: animation.value / 100,
                color: color,
              ),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '$score',
                      style: Theme.of(context)
                          .textTheme
                          .displayLarge
                          ?.copyWith(
                            color: color,
                            fontWeight: FontWeight.bold,
                            fontSize: 48,
                          ),
                    ),
                    Text(
                      'Momentum',
                      style: Theme.of(context)
                          .textTheme
                          .bodyMedium
                          ?.copyWith(color: AppColors.textTertiary),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Draws a circular arc proportional to [progress] (0.0 - 1.0).
class _RingPainter extends CustomPainter {
  final double progress;
  final Color color;

  _RingPainter({required this.progress, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 10;
    const strokeWidth = 10.0;

    // Track (dim background ring)
    final trackPaint = Paint()
      ..color = AppColors.border
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, trackPaint);

    // Progress arc
    final progressPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2, // start at top
      2 * math.pi * progress,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.progress != progress || old.color != color;
}

/// A labelled horizontal bar showing a single component value (0.0 - 1.0).
class _ComponentBar extends StatelessWidget {
  final String label;
  final double value;
  final Color color;

  const _ComponentBar({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final pct = (value * 100).round();
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: GlassCard(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(label, style: Theme.of(context).textTheme.labelLarge),
                Text(
                  '$pct%',
                  style: Theme.of(context)
                      .textTheme
                      .labelLarge
                      ?.copyWith(color: color),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: value.clamp(0.0, 1.0),
                minHeight: 6,
                backgroundColor: AppColors.border,
                valueColor: AlwaysStoppedAnimation(color),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A small date+score badge used in the horizontal history scroll.
class _HistoryBadge extends StatelessWidget {
  final int score;
  final String date;
  final Color color;

  const _HistoryBadge({
    required this.score,
    required this.date,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    // Parse "YYYY-MM-DD" to show "Mar 5" style label.
    final parts = date.split('-');
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    final label = parts.length >= 3
        ? '${months[int.parse(parts[1]) - 1]} ${int.parse(parts[2])}'
        : date;

    return Container(
      width: 56,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            '$score',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: color,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: Theme.of(context)
                .textTheme
                .labelSmall
                ?.copyWith(fontSize: 10),
          ),
        ],
      ),
    );
  }
}
