import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../data/life_map_service.dart';

/// Displays a radar/hexagonal visualization of 6 life domains, giving
/// the user a holistic view of where they are thriving and where they
/// might need to invest more effort.
class LifeMapScreen extends StatefulWidget {
  const LifeMapScreen({super.key});

  @override
  State<LifeMapScreen> createState() => _LifeMapScreenState();
}

class _LifeMapScreenState extends State<LifeMapScreen> {
  final _service = LifeMapService();

  List<DomainScore> _scores = [];
  bool _loading = true;
  String? _error;

  /// Tracks which domain cards are expanded to show active goals.
  final Set<String> _expanded = {};

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
      final scores = await _service.getScores();
      if (!mounted) return;
      setState(() {
        _scores = scores;
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

  Future<void> _refresh() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final scores = await _service.refresh();
      if (!mounted) return;
      setState(() {
        _scores = scores;
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

  double get _overallScore {
    if (_scores.isEmpty) return 0;
    final total = _scores.fold<double>(0, (sum, s) => sum + s.score);
    return total / _scores.length;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: const Text('Life Map'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined, size: 20),
            color: AppColors.textSecondary,
            tooltip: 'Refresh',
            onPressed: _refresh,
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
          Text('Failed to load life map',
              style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _load, child: const Text('Retry')),
        ],
      ),
    );
  }

  Widget _buildBody() {
    final hasGoals = _scores.any((s) => s.goalCount > 0);

    if (!hasGoals) return _buildEmpty();

    return RefreshIndicator(
      onRefresh: _refresh,
      color: AppColors.primary,
      backgroundColor: AppColors.surface,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: [
          // -- Radar chart --
          SizedBox(
            height: 280,
            child: CustomPaint(
              painter: _RadarChartPainter(
                scores: _scores,
                domainColors: _scores
                    .map((s) => _domainVisual(s.domain).color)
                    .toList(),
              ),
              size: Size.infinite,
            ),
          ),

          const SizedBox(height: 8),

          // -- Overall score --
          Center(
            child: Column(
              children: [
                Text(
                  '${_overallScore.round()}',
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                      ),
                ),
                Text(
                  'Overall Life Score',
                  style: Theme.of(context)
                      .textTheme
                      .labelSmall
                      ?.copyWith(color: AppColors.textTertiary),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // -- Domain cards --
          Text('Domains',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),

          ..._scores.map((score) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _DomainCard(
                  score: score,
                  visual: _domainVisual(score.domain),
                  isExpanded: _expanded.contains(score.domain),
                  onToggle: () => setState(() {
                    if (_expanded.contains(score.domain)) {
                      _expanded.remove(score.domain);
                    } else {
                      _expanded.add(score.domain);
                    }
                  }),
                ),
              )),

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
              Icons.hexagon_outlined,
              size: 56,
              color: AppColors.textTertiary.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 16),
            Text(
              'Your Life Map is empty',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Set goals across different life domains -- health, career, '
              'relationships, finance, learning, and personal growth -- to '
              'see your life map take shape.',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  static _DomainVisual _domainVisual(String domain) {
    switch (domain) {
      case 'health':
        return const _DomainVisual(
          icon: Icons.favorite_outlined,
          color: Color(0xFF10B981),
          label: 'Health',
        );
      case 'career':
        return const _DomainVisual(
          icon: Icons.work_outlined,
          color: Color(0xFF3B82F6),
          label: 'Career',
        );
      case 'relationships':
        return const _DomainVisual(
          icon: Icons.people_outlined,
          color: Color(0xFFEC4899),
          label: 'Relationships',
        );
      case 'finance':
        return const _DomainVisual(
          icon: Icons.account_balance_wallet_outlined,
          color: Color(0xFFF59E0B),
          label: 'Finance',
        );
      case 'learning':
        return const _DomainVisual(
          icon: Icons.school_outlined,
          color: Color(0xFFA855F7),
          label: 'Learning',
        );
      case 'personal':
        return const _DomainVisual(
          icon: Icons.auto_awesome_outlined,
          color: Color(0xFF06B6D4),
          label: 'Personal',
        );
      default:
        return const _DomainVisual(
          icon: Icons.circle_outlined,
          color: AppColors.textSecondary,
          label: 'Unknown',
        );
    }
  }
}

// =============================================================================
// Private widgets
// =============================================================================

class _DomainVisual {
  final IconData icon;
  final Color color;
  final String label;
  const _DomainVisual({
    required this.icon,
    required this.color,
    required this.label,
  });
}

/// A single domain card with score bar, insight, and expandable goals list.
class _DomainCard extends StatelessWidget {
  final DomainScore score;
  final _DomainVisual visual;
  final bool isExpanded;
  final VoidCallback onToggle;

  const _DomainCard({
    required this.score,
    required this.visual,
    required this.isExpanded,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      onTap: onToggle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row: icon, name, score bar, chevron
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: visual.color.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(visual.icon, size: 18, color: visual.color),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          visual.label,
                          style: Theme.of(context).textTheme.labelLarge,
                        ),
                        const Spacer(),
                        Text(
                          '${score.score.round()}%',
                          style: Theme.of(context)
                              .textTheme
                              .labelSmall
                              ?.copyWith(
                                color: visual.color,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(3),
                      child: LinearProgressIndicator(
                        value: (score.score / 100).clamp(0.0, 1.0),
                        minHeight: 4,
                        backgroundColor: AppColors.border,
                        valueColor: AlwaysStoppedAnimation(visual.color),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              AnimatedRotation(
                turns: isExpanded ? 0.25 : 0,
                duration: const Duration(milliseconds: 200),
                child: Icon(
                  Icons.chevron_right_rounded,
                  size: 20,
                  color: AppColors.textTertiary,
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Goal count + insight
          Row(
            children: [
              const SizedBox(width: 50),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${score.goalCount} goal${score.goalCount == 1 ? '' : 's'}',
                      style: Theme.of(context)
                          .textTheme
                          .labelSmall
                          ?.copyWith(fontSize: 10),
                    ),
                    if (score.topInsight != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        score.topInsight!,
                        style: Theme.of(context).textTheme.bodyMedium,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),

          // Expandable active goals list
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: _buildGoalsList(context),
            crossFadeState: isExpanded
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 200),
          ),
        ],
      ),
    );
  }

  Widget _buildGoalsList(BuildContext context) {
    if (score.activeGoals.isEmpty) {
      return Padding(
        padding: const EdgeInsets.only(top: 12, left: 50),
        child: Text(
          'No active goals',
          style: Theme.of(context)
              .textTheme
              .bodyMedium
              ?.copyWith(color: AppColors.textTertiary),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        children: score.activeGoals.map((goal) {
          final progress = ((goal['progress'] as num?) ?? 0).toDouble();
          return Padding(
            padding: const EdgeInsets.only(bottom: 8, left: 50),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    goal['title'] as String? ?? '',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textPrimary,
                        ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  width: 48,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(2),
                    child: LinearProgressIndicator(
                      value: (progress / 100).clamp(0.0, 1.0),
                      minHeight: 3,
                      backgroundColor: AppColors.border,
                      valueColor: AlwaysStoppedAnimation(visual.color),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  '${progress.round()}%',
                  style: Theme.of(context)
                      .textTheme
                      .labelSmall
                      ?.copyWith(fontSize: 10, color: AppColors.textTertiary),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

// =============================================================================
// Radar chart painter
// =============================================================================

/// Draws a hexagonal radar chart with concentric grid lines at 25/50/75/100%
/// and a filled polygon representing the user's scores across 6 domains.
class _RadarChartPainter extends CustomPainter {
  final List<DomainScore> scores;
  final List<Color> domainColors;

  _RadarChartPainter({
    required this.scores,
    required this.domainColors,
  });

  static const _gridLevels = [0.25, 0.50, 0.75, 1.0];

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2 - 32;
    final count = scores.length;
    if (count == 0) return;

    // Angle offset so "health" starts at the top (-pi/2).
    const startAngle = -math.pi / 2;

    // -- Grid lines (concentric hexagons) --
    final gridPaint = Paint()
      ..color = AppColors.border
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.8;

    for (final level in _gridLevels) {
      final path = Path();
      for (var i = 0; i < count; i++) {
        final angle = startAngle + (2 * math.pi * i / count);
        final x = center.dx + radius * level * math.cos(angle);
        final y = center.dy + radius * level * math.sin(angle);
        if (i == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }
      path.close();
      canvas.drawPath(path, gridPaint);
    }

    // -- Axis lines from center to each vertex --
    final axisPaint = Paint()
      ..color = AppColors.border
      ..strokeWidth = 0.5;

    for (var i = 0; i < count; i++) {
      final angle = startAngle + (2 * math.pi * i / count);
      final outerX = center.dx + radius * math.cos(angle);
      final outerY = center.dy + radius * math.sin(angle);
      canvas.drawLine(center, Offset(outerX, outerY), axisPaint);
    }

    // -- Filled score polygon --
    final scorePath = Path();
    for (var i = 0; i < count; i++) {
      final angle = startAngle + (2 * math.pi * i / count);
      final value = (scores[i].score / 100).clamp(0.0, 1.0);
      final x = center.dx + radius * value * math.cos(angle);
      final y = center.dy + radius * value * math.sin(angle);
      if (i == 0) {
        scorePath.moveTo(x, y);
      } else {
        scorePath.lineTo(x, y);
      }
    }
    scorePath.close();

    // Fill with translucent primary.
    final fillPaint = Paint()
      ..color = AppColors.primary.withValues(alpha: 0.2)
      ..style = PaintingStyle.fill;
    canvas.drawPath(scorePath, fillPaint);

    // Stroke outline.
    final strokePaint = Paint()
      ..color = AppColors.primary
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    canvas.drawPath(scorePath, strokePaint);

    // -- Score dots at each vertex --
    for (var i = 0; i < count; i++) {
      final angle = startAngle + (2 * math.pi * i / count);
      final value = (scores[i].score / 100).clamp(0.0, 1.0);
      final x = center.dx + radius * value * math.cos(angle);
      final y = center.dy + radius * value * math.sin(angle);

      canvas.drawCircle(
        Offset(x, y),
        4,
        Paint()..color = domainColors[i],
      );
      canvas.drawCircle(
        Offset(x, y),
        4,
        Paint()
          ..color = AppColors.bg
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.5,
      );
    }

    // -- Domain labels outside the chart --
    for (var i = 0; i < count; i++) {
      final angle = startAngle + (2 * math.pi * i / count);
      final labelRadius = radius + 20;
      final x = center.dx + labelRadius * math.cos(angle);
      final y = center.dy + labelRadius * math.sin(angle);

      final label = scores[i].domain[0].toUpperCase() +
          scores[i].domain.substring(1);

      final textSpan = TextSpan(
        text: label,
        style: TextStyle(
          color: domainColors[i],
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      );
      final textPainter = TextPainter(
        text: textSpan,
        textDirection: TextDirection.ltr,
      )..layout();

      // Center the label on the computed point.
      final offset = Offset(
        x - textPainter.width / 2,
        y - textPainter.height / 2,
      );
      textPainter.paint(canvas, offset);
    }
  }

  @override
  bool shouldRepaint(covariant _RadarChartPainter oldDelegate) {
    return oldDelegate.scores != scores;
  }
}
