import 'package:flutter/material.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/life_coach_service.dart';

class LifeCoachScreen extends StatefulWidget {
  const LifeCoachScreen({super.key});

  @override
  State<LifeCoachScreen> createState() => _LifeCoachScreenState();
}

class _LifeCoachScreenState extends State<LifeCoachScreen> {
  final _service = LifeCoachService();
  CoachReport? _report;
  bool _loading = true;
  bool _regenerating = false;
  String? _error;

  static const _domainIcons = <String, IconData>{
    'health': Icons.favorite_outlined,
    'productivity': Icons.bolt_outlined,
    'habits': Icons.trending_up_outlined,
    'finance': Icons.attach_money_outlined,
    'mindset': Icons.psychology_outlined,
    'goals': Icons.flag_outlined,
  };

  static const _urgencyColors = <String, Color>{
    'high': Color(0xFFEF4444),
    'medium': Color(0xFFEAB308),
    'low': Color(0xFF22C55E),
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool force = false}) async {
    if (force) {
      setState(() => _regenerating = true);
    } else {
      setState(() { _loading = true; _error = null; });
    }
    try {
      final report = await _service.getReport(force: force);
      setState(() => _report = report);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() { _loading = false; _regenerating = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF060810),
      appBar: AppBar(
        backgroundColor: const Color(0xFF060810),
        title: const Text('AI Life Coach', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: _regenerating
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Color(0xFF6366F1), strokeWidth: 2))
                : const Icon(Icons.refresh_outlined, color: Color(0xFF9CA3AF)),
            onPressed: _regenerating ? null : () => _load(force: true),
            tooltip: 'Regenerate',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(color: Color(0xFF6366F1)),
                SizedBox(height: 12),
                Text('Analysing your data…', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13)),
              ],
            ))
          : _error != null
              ? Center(child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(_error!, style: const TextStyle(color: Color(0xFFEF4444)), textAlign: TextAlign.center),
                ))
              : _buildReport(),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }

  Widget _buildReport() {
    final r = _report;
    if (r == null) return const SizedBox();

    String generatedLabel = '';
    try {
      final dt = DateTime.parse(r.generatedAt).toLocal();
      generatedLabel = '${dt.day}/${dt.month}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {}

    return RefreshIndicator(
      onRefresh: () => _load(force: true),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Generated timestamp
          if (generatedLabel.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text('Generated $generatedLabel', style: const TextStyle(color: Color(0xFF6B7280), fontSize: 11)),
            ),

          // Summary card
          Container(
            padding: const EdgeInsets.all(16),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0x146366F1), Color(0x0DA855F7)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(r.summary, style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.6)),
                if (r.focusThisWeek != null) ...[
                  const SizedBox(height: 12),
                  const Divider(color: Color(0xFF1E2136)),
                  const SizedBox(height: 8),
                  const Text('FOCUS THIS WEEK', style: TextStyle(color: Color(0xFF6B7280), fontSize: 10, letterSpacing: 0.8)),
                  const SizedBox(height: 4),
                  Text(r.focusThisWeek!, style: const TextStyle(color: Color(0xFFA5B4FC), fontSize: 13, fontWeight: FontWeight.w600)),
                ],
              ],
            ),
          ),

          // Insight cards
          ...r.insights.map((insight) => _buildInsightCard(insight)),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _buildInsightCard(CoachingInsight insight) {
    final urgencyColor = _urgencyColors[insight.urgency] ?? const Color(0xFFEAB308);
    final domainIcon = _domainIcons[insight.domain.toLowerCase()] ?? Icons.psychology_outlined;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0D0F1A),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF1E2136)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 28, height: 28,
                decoration: BoxDecoration(
                  color: const Color(0xFF6366F1).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(domainIcon, size: 15, color: const Color(0xFF818CF8)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(insight.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: urgencyColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: urgencyColor.withValues(alpha: 0.3)),
                ),
                child: Text(
                  insight.urgency[0].toUpperCase() + insight.urgency.substring(1),
                  style: TextStyle(color: urgencyColor, fontSize: 10, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(insight.observation, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12, height: 1.5)),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _miniBlock('Action', insight.action)),
              const SizedBox(width: 8),
              Expanded(child: _miniBlock('Impact', insight.impact)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _miniBlock(String label, String text) => Container(
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(
      color: const Color(0xFF1A1D2E),
      borderRadius: BorderRadius.circular(8),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(), style: const TextStyle(color: Color(0xFF6B7280), fontSize: 9, letterSpacing: 0.6)),
        const SizedBox(height: 4),
        Text(text, style: const TextStyle(color: Colors.white, fontSize: 11, height: 1.4)),
      ],
    ),
  );
}
