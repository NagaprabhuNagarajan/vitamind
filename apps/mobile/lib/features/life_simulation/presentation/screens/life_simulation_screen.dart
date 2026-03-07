import 'package:flutter/material.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/life_simulation_service.dart';

class LifeSimulationScreen extends StatefulWidget {
  const LifeSimulationScreen({super.key});

  @override
  State<LifeSimulationScreen> createState() => _LifeSimulationScreenState();
}

class _LifeSimulationScreenState extends State<LifeSimulationScreen> {
  final _service = LifeSimulationService();
  final _scenarioCtrl = TextEditingController();
  SimulationResult? _result;
  bool _loading = false;
  String? _error;

  static const _examples = [
    'Exercise 5 days a week for the next 12 months',
    'Save 20% of my income every month',
    'Sleep 8 hours every night',
    'Work on my side project 1 hour every day',
    'Meditate for 10 minutes every morning',
  ];

  static const _monthLabels = {1: '1 Month', 3: '3 Months', 6: '6 Months', 12: '12 Months'};

  @override
  void dispose() {
    _scenarioCtrl.dispose();
    super.dispose();
  }

  Color _probColor(int p) => p >= 70
      ? const Color(0xFF22C55E)
      : p >= 40
          ? const Color(0xFFEAB308)
          : const Color(0xFFEF4444);

  Future<void> _simulate([String? text]) async {
    final s = (text ?? _scenarioCtrl.text).trim();
    if (s.isEmpty) return;
    if (text != null) _scenarioCtrl.text = text;
    setState(() { _loading = true; _error = null; _result = null; });
    try {
      final r = await _service.simulate(s);
      setState(() => _result = r);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF060810),
      appBar: AppBar(
        backgroundColor: const Color(0xFF060810),
        title: const Text('Life Simulation', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildInput(),
          const SizedBox(height: 16),
          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 32),
              child: Column(
                children: [
                  CircularProgressIndicator(color: Color(0xFF6366F1)),
                  SizedBox(height: 12),
                  Text('Projecting your future…', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13)),
                ],
              ),
            )
          else if (_error != null)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(_error!, style: const TextStyle(color: Color(0xFFEF4444)), textAlign: TextAlign.center),
            )
          else if (_result != null)
            _buildResult(_result!),
          const SizedBox(height: 80),
        ],
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }

  Widget _buildInput() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: const Color(0xFF0D0F1A), borderRadius: BorderRadius.circular(14)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Describe Your Scenario', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15)),
          const SizedBox(height: 10),
          TextField(
            controller: _scenarioCtrl,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            maxLines: 3,
            decoration: const InputDecoration(
              hintText: 'e.g. I start waking up at 6am and exercising every morning for the next year',
              hintStyle: TextStyle(color: Color(0xFF6B7280), fontSize: 12),
              filled: true,
              fillColor: Color(0xFF1A1D2E),
              border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(10)), borderSide: BorderSide.none),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
          ),
          const SizedBox(height: 10),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(_error!, style: const TextStyle(color: Color(0xFFEF4444), fontSize: 12)),
            ),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _loading ? null : () => _simulate(),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6366F1),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: _loading
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Run Simulation', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
          const SizedBox(height: 12),
          const Text('EXAMPLES', style: TextStyle(color: Color(0xFF6B7280), fontSize: 10, letterSpacing: 0.6)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: _examples.map((e) => GestureDetector(
              onTap: _loading ? null : () => _simulate(e),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFF1A1D2E),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF2D3148)),
                ),
                child: Text(e, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 11)),
              ),
            )).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildResult(SimulationResult r) {
    final pc = _probColor(r.probabilityOfSuccess);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Summary + probability
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: const Color(0xFF0D0F1A), borderRadius: BorderRadius.circular(14)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: Text(r.scenario, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13))),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('${r.probabilityOfSuccess}%', style: TextStyle(color: pc, fontSize: 22, fontWeight: FontWeight.bold)),
                      const Text('success', style: TextStyle(color: Color(0xFF6B7280), fontSize: 10)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: r.probabilityOfSuccess / 100,
                  backgroundColor: const Color(0xFF1A1D2E),
                  valueColor: AlwaysStoppedAnimation(pc),
                  minHeight: 6,
                ),
              ),
              const SizedBox(height: 10),
              Text(r.summary, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12, height: 1.5)),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF6366F1).withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('AT 12 MONTHS', style: TextStyle(color: Color(0xFF6B7280), fontSize: 9, letterSpacing: 0.6)),
                    const SizedBox(height: 4),
                    Text(r.outcomeAt12Months, style: const TextStyle(color: Colors.white, fontSize: 12, height: 1.4)),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Timeline
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: const Color(0xFF0D0F1A), borderRadius: BorderRadius.circular(14)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('PROJECTED TIMELINE', style: TextStyle(color: Color(0xFF6B7280), fontSize: 10, letterSpacing: 0.6)),
              const SizedBox(height: 12),
              ...r.milestones.asMap().entries.map((entry) {
                final i = entry.key;
                final m = entry.value;
                final mpc = _probColor(m.probability);
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(
                      children: [
                        Container(
                          width: 22, height: 22,
                          decoration: BoxDecoration(
                            color: mpc.withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                            border: Border.all(color: mpc.withValues(alpha: 0.4)),
                          ),
                          child: Icon(Icons.chevron_right, size: 14, color: mpc),
                        ),
                        if (i < r.milestones.length - 1)
                          Container(width: 1, height: 40, color: const Color(0xFF1E2136)),
                      ],
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(_monthLabels[m.month] ?? '${m.month}m', style: const TextStyle(color: Color(0xFF818CF8), fontSize: 11, fontWeight: FontWeight.w600)),
                                const Text(' · ', style: TextStyle(color: Color(0xFF6B7280))),
                                Text('${m.probability}% likely', style: const TextStyle(color: Color(0xFF6B7280), fontSize: 11)),
                                if (m.metric != null) ...[
                                  const Text(' · ', style: TextStyle(color: Color(0xFF6B7280))),
                                  Expanded(child: Text(m.metric!, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500), overflow: TextOverflow.ellipsis)),
                                ],
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(m.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 12)),
                            Text(m.description, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 11, height: 1.4)),
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              }),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Risks + Enablers
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: _miniList('KEY RISKS', r.keyRisks, const Color(0xFFEF4444), '✕')),
            const SizedBox(width: 8),
            Expanded(child: _miniList('ENABLERS', r.keyEnablers, const Color(0xFF22C55E), '✓')),
          ],
        ),
        const SizedBox(height: 12),

        // First step
        if (r.recommendation.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF6366F1).withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('FIRST STEP', style: TextStyle(color: Color(0xFF6B7280), fontSize: 9, letterSpacing: 0.6)),
                const SizedBox(height: 4),
                Text(r.recommendation, style: const TextStyle(color: Colors.white, fontSize: 12, height: 1.4)),
              ],
            ),
          ),
      ],
    );
  }

  Widget _miniList(String label, List<String> items, Color color, String bullet) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: const Color(0xFF0D0F1A), borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: color, fontSize: 9, letterSpacing: 0.6)),
          const SizedBox(height: 8),
          ...items.map((item) => Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('$bullet ', style: TextStyle(color: color, fontSize: 10)),
                Expanded(child: Text(item, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 10, height: 1.4))),
              ],
            ),
          )),
        ],
      ),
    );
  }
}
