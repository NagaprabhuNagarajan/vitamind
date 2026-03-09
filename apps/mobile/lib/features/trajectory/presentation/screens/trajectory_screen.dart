import 'package:flutter/material.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/trajectory_service.dart';

class TrajectoryScreen extends StatefulWidget {
  const TrajectoryScreen({super.key});

  @override
  State<TrajectoryScreen> createState() => _TrajectoryScreenState();
}

class _TrajectoryScreenState extends State<TrajectoryScreen> {
  final _service = TrajectoryService();
  TrajectoryReport? _report;
  bool _loading = true;
  bool _refreshing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool force = false}) async {
    if (force) {
      setState(() => _refreshing = true);
    } else {
      setState(() { _loading = true; _error = null; });
    }
    try {
      final report = await _service.getReport(force: force);
      setState(() => _report = report);
    } catch (e) {
      setState(() => _error = 'Failed to load trajectory');
    } finally {
      setState(() { _loading = false; _refreshing = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF060810),
      appBar: AppBar(
        backgroundColor: const Color(0xFF060810),
        title: const Text('Life Trajectory', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          if (_refreshing)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF6366F1))),
            )
          else
            IconButton(icon: const Icon(Icons.refresh, size: 20), onPressed: () => _load(force: true)),
        ],
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
          : _error != null
              ? _errorView()
              : _body(),
    );
  }

  Widget _errorView() => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.error_outline, color: Color(0xFFEF4444), size: 36),
        const SizedBox(height: 12),
        Text(_error!, style: const TextStyle(color: Color(0xFFEF4444), fontSize: 14)),
        const SizedBox(height: 16),
        TextButton(onPressed: _load, child: const Text('Retry', style: TextStyle(color: Color(0xFF6366F1)))),
      ]),
    ),
  );

  Widget _body() {
    final report = _report!;
    final overallColor = _trendColor(report.overallTrend);
    final overallIcon = _trendIcon(report.overallTrend);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Overall trend badge
          Row(children: [
            Icon(overallIcon, color: overallColor, size: 16),
            const SizedBox(width: 6),
            Text(
              _trendLabel(report.overallTrend),
              style: TextStyle(color: overallColor, fontSize: 13, fontWeight: FontWeight.w600),
            ),
            const SizedBox(width: 8),
            const Text('· last 14 days', style: TextStyle(color: Color(0xFF6B7280), fontSize: 11)),
          ]),

          const SizedBox(height: 16),

          // Highest Impact Action
          _hiaCard(report.highestImpactAction),

          const SizedBox(height: 16),

          // Domain grid
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.5,
            ),
            itemCount: report.domains.length,
            itemBuilder: (_, i) => _domainCard(report.domains[i]),
          ),

          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _hiaCard(HighestImpactAction hia) {
    final color = _domainColor(hia.domain);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(Icons.bolt_outlined, color: color, size: 14),
          const SizedBox(width: 6),
          Text('Highest Impact Action', style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
        ]),
        const SizedBox(height: 8),
        Text(hia.action, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500)),
        const SizedBox(height: 4),
        Text(hia.projectedImpact, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 11)),
      ]),
    );
  }

  Widget _domainCard(DomainVelocity d) {
    final domainColor = _domainColor(d.domain);
    final trendColor = _trendColor(d.trend);
    final trendIcon = _trendIcon(d.trend);
    final deltaStr = d.delta > 0 ? '+${d.delta}' : '${d.delta}';

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Icon(_domainIcon(d.domain), color: domainColor, size: 14),
          Row(children: [
            Icon(trendIcon, color: trendColor, size: 12),
            const SizedBox(width: 3),
            Text(deltaStr, style: TextStyle(color: trendColor, fontSize: 11, fontWeight: FontWeight.w600, fontFeatures: const [FontFeature.tabularFigures()])),
          ]),
        ]),
        const Spacer(),
        Text(
          _domainLabel(d.domain),
          style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 10),
        ),
        const SizedBox(height: 2),
        Text('${d.score}%', style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: d.score / 100,
            backgroundColor: Colors.white.withValues(alpha: 0.06),
            valueColor: AlwaysStoppedAnimation<Color>(domainColor),
            minHeight: 3,
          ),
        ),
      ]),
    );
  }

  Color _trendColor(String trend) => switch (trend) {
    'up'   => const Color(0xFF22C55E),
    'down' => const Color(0xFFEF4444),
    _      => const Color(0xFF9CA3AF),
  };

  IconData _trendIcon(String trend) => switch (trend) {
    'up'   => Icons.trending_up_rounded,
    'down' => Icons.trending_down_rounded,
    _      => Icons.remove_rounded,
  };

  String _trendLabel(String trend) => switch (trend) {
    'up'   => 'Improving',
    'down' => 'Declining',
    _      => 'Stable',
  };

  Color _domainColor(String domain) => switch (domain) {
    'health'        => const Color(0xFFEF4444),
    'career'        => const Color(0xFF6366F1),
    'relationships' => const Color(0xFFEC4899),
    'finance'       => const Color(0xFF22C55E),
    'learning'      => const Color(0xFFF59E0B),
    _               => const Color(0xFFA855F7),
  };

  IconData _domainIcon(String domain) => switch (domain) {
    'health'        => Icons.favorite_border_rounded,
    'career'        => Icons.work_outline_rounded,
    'relationships' => Icons.people_outline_rounded,
    'finance'       => Icons.attach_money_rounded,
    'learning'      => Icons.menu_book_outlined,
    _               => Icons.auto_awesome_outlined,
  };

  String _domainLabel(String domain) => switch (domain) {
    'health'        => 'Health',
    'career'        => 'Career',
    'relationships' => 'Relationships',
    'finance'       => 'Finance',
    'learning'      => 'Learning',
    _               => 'Personal',
  };
}
