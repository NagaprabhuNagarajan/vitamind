import 'package:flutter/material.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/decisions_service.dart';

class DecisionsScreen extends StatefulWidget {
  const DecisionsScreen({super.key});

  @override
  State<DecisionsScreen> createState() => _DecisionsScreenState();
}

class _DecisionsScreenState extends State<DecisionsScreen> {
  final _service = DecisionsService();
  List<Decision> _history = [];
  bool _loadingHistory = true;
  bool _analyzing = false;
  String? _expandedId;

  final _questionCtrl = TextEditingController();
  final _optionCtrls = [TextEditingController(), TextEditingController()];

  static const _riskColors = <String, Color>{
    'low': Color(0xFF22C55E),
    'medium': Color(0xFFEAB308),
    'high': Color(0xFFEF4444),
  };

  static const _confidenceColors = <String, Color>{
    'high': Color(0xFF22C55E),
    'medium': Color(0xFFEAB308),
    'low': Color(0xFFEF4444),
  };

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void dispose() {
    _questionCtrl.dispose();
    for (final c in _optionCtrls) { c.dispose(); }
    super.dispose();
  }

  Future<void> _loadHistory() async {
    try {
      final h = await _service.getHistory();
      setState(() => _history = h);
    } catch (_) {
    } finally {
      setState(() => _loadingHistory = false);
    }
  }

  Future<void> _analyze() async {
    final question = _questionCtrl.text.trim();
    final options = _optionCtrls.map((c) => c.text.trim()).where((s) => s.isNotEmpty).toList();
    if (question.isEmpty || options.length < 2) return;
    setState(() => _analyzing = true);
    try {
      final d = await _service.analyze(question: question, options: options);
      setState(() {
        _history.insert(0, d);
        _expandedId = d.id;
      });
      _questionCtrl.clear();
      for (final c in _optionCtrls) { c.clear(); }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Analysis failed: $e'), backgroundColor: const Color(0xFFEF4444)),
        );
      }
    } finally {
      setState(() => _analyzing = false);
    }
  }

  Future<void> _delete(String id) async {
    await _service.delete(id);
    setState(() {
      _history.removeWhere((d) => d.id == id);
      if (_expandedId == id) _expandedId = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF060810),
      appBar: AppBar(
        backgroundColor: const Color(0xFF060810),
        title: const Text('Decision Engine', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: _loadHistory,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildForm(),
            const SizedBox(height: 24),
            if (_loadingHistory)
              const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
            else if (_history.isEmpty)
              Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(color: const Color(0xFF0D0F1A), borderRadius: BorderRadius.circular(14)),
                child: const Center(child: Text('No decisions yet.\nUse the form above to get started.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF6B7280)))),
              )
            else ...[
              const Text('HISTORY', style: TextStyle(color: Color(0xFF6B7280), fontSize: 10, letterSpacing: 0.8)),
              const SizedBox(height: 8),
              ..._history.map((d) => _buildDecisionCard(d)),
            ],
            const SizedBox(height: 80),
          ],
        ),
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }

  Widget _buildForm() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: const Color(0xFF0D0F1A), borderRadius: BorderRadius.circular(14)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('New Decision', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15)),
          const SizedBox(height: 12),
          TextField(
            controller: _questionCtrl,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            maxLines: 2,
            decoration: _inputDeco('What decision are you facing?'),
          ),
          const SizedBox(height: 12),
          const Text('OPTIONS', style: TextStyle(color: Color(0xFF6B7280), fontSize: 10, letterSpacing: 0.6)),
          const SizedBox(height: 6),
          ..._optionCtrls.asMap().entries.map((e) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: TextField(
              controller: e.value,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: _inputDeco('Option ${e.key + 1}'),
            ),
          )),
          if (_optionCtrls.length < 5)
            TextButton.icon(
              onPressed: () => setState(() => _optionCtrls.add(TextEditingController())),
              icon: const Icon(Icons.add, size: 16, color: Color(0xFF6B7280)),
              label: const Text('Add option', style: TextStyle(color: Color(0xFF6B7280), fontSize: 12)),
            ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _analyzing ? null : _analyze,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6366F1),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: _analyzing
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Analyse Decision', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDecisionCard(Decision d) {
    final expanded = _expandedId == d.id;
    final a = d.analysis;
    final confColor = _confidenceColors[a?.confidence] ?? const Color(0xFFEAB308);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(color: const Color(0xFF0D0F1A), borderRadius: BorderRadius.circular(12)),
      child: Column(
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => setState(() => _expandedId = expanded ? null : d.id),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(d.question, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
                        const SizedBox(height: 4),
                        if (a != null)
                          Text('${a.confidence[0].toUpperCase()}${a.confidence.substring(1)} confidence',
                            style: TextStyle(color: confColor, fontSize: 11)),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, size: 18, color: Color(0xFF6B7280)),
                    onPressed: () => _delete(d.id),
                  ),
                  Icon(expanded ? Icons.expand_less : Icons.expand_more, color: const Color(0xFF6B7280)),
                ],
              ),
            ),
          ),
          if (expanded && a != null) _buildAnalysis(a),
        ],
      ),
    );
  }

  Widget _buildAnalysis(DecisionAnalysis a) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Divider(color: Color(0xFF1E2136)),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF6366F1).withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('RECOMMENDATION', style: TextStyle(color: Color(0xFF6B7280), fontSize: 9, letterSpacing: 0.6)),
                const SizedBox(height: 4),
                Text(a.recommendation, style: const TextStyle(color: Colors.white, fontSize: 12, height: 1.5)),
              ],
            ),
          ),
          const SizedBox(height: 12),
          ...a.optionsAnalysis.map((opt) => _buildOptionCard(opt)),
          if (a.keyConsiderations.isNotEmpty) ...[
            const SizedBox(height: 8),
            const Text('KEY CONSIDERATIONS', style: TextStyle(color: Color(0xFF6B7280), fontSize: 9, letterSpacing: 0.6)),
            const SizedBox(height: 6),
            ...a.keyConsiderations.map((c) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('• ', style: TextStyle(color: Color(0xFF6366F1))),
                  Expanded(child: Text(c, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 11, height: 1.4))),
                ],
              ),
            )),
          ],
        ],
      ),
    );
  }

  Widget _buildOptionCard(DecisionOption opt) {
    final riskColor = _riskColors[opt.riskLevel] ?? const Color(0xFFEAB308);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1D2E),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(opt.option, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 12))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: riskColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: riskColor.withValues(alpha: 0.3)),
                ),
                child: Text('${opt.riskLevel} risk', style: TextStyle(color: riskColor, fontSize: 9, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value: opt.goalAlignment / 100,
              backgroundColor: const Color(0xFF1E2136),
              valueColor: const AlwaysStoppedAnimation(Color(0xFF6366F1)),
              minHeight: 3,
            ),
          ),
          const SizedBox(height: 2),
          Text('${opt.goalAlignment}% goal aligned', style: const TextStyle(color: Color(0xFF6B7280), fontSize: 9)),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Pros', style: TextStyle(color: Color(0xFF22C55E), fontSize: 10)),
                    ...opt.pros.map((p) => Text('+ $p', style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 10, height: 1.4))),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Cons', style: TextStyle(color: Color(0xFFEF4444), fontSize: 10)),
                    ...opt.cons.map((c) => Text('- $c', style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 10, height: 1.4))),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  InputDecoration _inputDeco(String hint) => InputDecoration(
    hintText: hint,
    hintStyle: const TextStyle(color: Color(0xFF6B7280), fontSize: 12),
    filled: true,
    fillColor: const Color(0xFF1A1D2E),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
  );
}
