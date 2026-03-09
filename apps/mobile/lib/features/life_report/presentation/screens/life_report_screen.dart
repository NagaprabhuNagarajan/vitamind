import 'package:flutter/material.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/life_report_service.dart';

class LifeReportScreen extends StatefulWidget {
  const LifeReportScreen({super.key});

  @override
  State<LifeReportScreen> createState() => _LifeReportScreenState();
}

class _LifeReportScreenState extends State<LifeReportScreen> {
  final _service = LifeReportService();
  LifeReport? _report;
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
    } catch (_) {
      setState(() => _error = 'Failed to load life report');
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
        title: const Text('Life Report', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
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
    final r = _report!;
    final hiaColor = _domainColor(r.highestImpactAction.domain);
    final burnoutMeta = _burnoutMeta(r.burnoutRisk);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // AI Greeting card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0x0F6366F1), Color(0x0FA855F7)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(r.greeting, style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.6)),
              if (r.healthSummary != null) ...[
                const SizedBox(height: 8),
                Text(r.healthSummary!, style: const TextStyle(color: Color(0xFF6B7280), fontSize: 11)),
              ],
            ]),
          ),

          const SizedBox(height: 14),

          // Momentum + Burnout row
          Row(children: [
            Expanded(
              child: _statCard(
                icon: Icons.electric_bolt_outlined,
                iconColor: const Color(0xFF6366F1),
                label: 'Momentum',
                value: '${r.momentumScore}',
                trailing: r.momentumTrend.length > 1
                    ? _MiniSparkline(values: r.momentumTrend.map((v) => v.toDouble()).toList())
                    : null,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _burnoutCard(burnoutMeta),
            ),
          ]),

          const SizedBox(height: 14),

          // Top Insight
          _infoCard(
            icon: Icons.trending_up_rounded,
            iconColor: const Color(0xFF6366F1),
            label: 'Top Pattern',
            body: r.topInsight,
          ),

          const SizedBox(height: 14),

          // Highest Impact Action
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: hiaColor.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: hiaColor.withValues(alpha: 0.3)),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Icon(Icons.bolt_outlined, color: hiaColor, size: 14),
                const SizedBox(width: 6),
                Text('Highest Impact Action', style: TextStyle(color: hiaColor, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
              ]),
              const SizedBox(height: 8),
              Text(r.highestImpactAction.action, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              Text(r.highestImpactAction.projectedImpact, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 11)),
            ]),
          ),

          // Domain mini-grid
          if (r.domains.isNotEmpty) ...[
            const SizedBox(height: 20),
            const Text('LIFE DOMAINS', style: TextStyle(color: Color(0xFF6B7280), fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                childAspectRatio: 1.1,
              ),
              itemCount: r.domains.length,
              itemBuilder: (_, i) {
                final d = r.domains[i];
                final dc = _domainColor(d.domain);
                final tc = _trendColor(d.trend);
                return Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF111827),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Icon(_domainIcon(d.domain), color: dc, size: 12),
                      Icon(_trendIcon(d.trend), color: tc, size: 12),
                    ]),
                    const Spacer(),
                    Text(_domainLabel(d.domain), style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 9), maxLines: 1, overflow: TextOverflow.ellipsis),
                    Text('${d.score}%', style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700)),
                  ]),
                );
              },
            ),
          ],

          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _statCard({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
    Widget? trailing,
  }) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: const Color(0xFF111827),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Icon(icon, color: iconColor, size: 14),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 10, letterSpacing: 0.5)),
      ]),
      const SizedBox(height: 8),
      Text(value, style: TextStyle(color: iconColor, fontSize: 28, fontWeight: FontWeight.w700)),
      if (trailing != null) ...[const SizedBox(height: 6), trailing],
    ]),
  );

  Widget _burnoutCard(Map<String, dynamic> meta) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: const Color(0xFF111827),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Icon(Icons.local_fire_department_outlined, color: meta['color'] as Color, size: 14),
        const SizedBox(width: 6),
        const Text('Burnout', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 10, letterSpacing: 0.5)),
      ]),
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: (meta['color'] as Color).withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: (meta['color'] as Color).withValues(alpha: 0.3)),
        ),
        child: Text(
          meta['label'] as String,
          style: TextStyle(color: meta['color'] as Color, fontSize: 11, fontWeight: FontWeight.w600),
        ),
      ),
    ]),
  );

  Widget _infoCard({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String body,
  }) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: const Color(0xFF111827),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Icon(icon, color: iconColor, size: 14),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 10, letterSpacing: 0.5, fontWeight: FontWeight.w600)),
      ]),
      const SizedBox(height: 8),
      Text(body, style: const TextStyle(color: Color(0xFFD1D5DB), fontSize: 12, height: 1.5)),
    ]),
  );

  Map<String, dynamic> _burnoutMeta(String risk) => switch (risk) {
    'high'   => {'label': 'High Risk',   'color': const Color(0xFFEF4444)},
    'medium' => {'label': 'Medium Risk', 'color': const Color(0xFFEAB308)},
    _        => {'label': 'Low Risk',    'color': const Color(0xFF22C55E)},
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
    'relationships' => 'Relations',
    'finance'       => 'Finance',
    'learning'      => 'Learning',
    _               => 'Personal',
  };

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
}

// ─── Mini Sparkline ───────────────────────────────────────────────────────────

class _MiniSparkline extends StatelessWidget {
  final List<double> values;
  const _MiniSparkline({required this.values});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(60, 18),
      painter: _SparklinePainter(values),
    );
  }
}

class _SparklinePainter extends CustomPainter {
  final List<double> values;
  _SparklinePainter(this.values);

  @override
  void paint(Canvas canvas, Size size) {
    if (values.length < 2) return;
    final min = values.reduce((a, b) => a < b ? a : b);
    final max = values.reduce((a, b) => a > b ? a : b);
    final range = (max - min).clamp(1.0, double.infinity);
    final paint = Paint()
      ..color = const Color(0xFF6366F1)
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final path = Path();
    for (var i = 0; i < values.length; i++) {
      final x = (i / (values.length - 1)) * size.width;
      final y = size.height - ((values[i] - min) / range) * size.height;
      i == 0 ? path.moveTo(x, y) : path.lineTo(x, y);
    }
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_SparklinePainter old) => old.values != values;
}
