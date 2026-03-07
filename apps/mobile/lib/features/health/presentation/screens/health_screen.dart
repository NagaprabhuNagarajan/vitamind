import 'package:flutter/material.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/health_service.dart';

class HealthScreen extends StatefulWidget {
  const HealthScreen({super.key});

  @override
  State<HealthScreen> createState() => _HealthScreenState();
}

class _HealthScreenState extends State<HealthScreen> {
  final _service = HealthService();
  List<HealthEntry> _entries = [];
  HealthInsights? _insights;
  bool _loading = true;

  static const _moodLabels = ['', 'Awful', 'Bad', 'Okay', 'Good', 'Great'];
  static const _moodColors = [
    Colors.transparent,
    Color(0xFFEF4444),
    Color(0xFFF97316),
    Color(0xFFEAB308),
    Color(0xFF22C55E),
    Color(0xFF6366F1),
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final result = await _service.getHealthData();
      setState(() {
        _entries = result.entries;
        _insights = result.insights;
      });
    } catch (_) {
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _showLogSheet() async {
    final sleepCtrl = TextEditingController();
    final stepsCtrl = TextEditingController();
    final waterCtrl = TextEditingController();
    final weightCtrl = TextEditingController();
    final exerciseCtrl = TextEditingController();
    final notesCtrl = TextEditingController();
    int? mood;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0D0F1A),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.only(
            left: 20, right: 20, top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Log health entry', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: _field(sleepCtrl, 'Sleep (hrs)', keyboard: TextInputType.number)),
                    const SizedBox(width: 8),
                    Expanded(child: _field(stepsCtrl, 'Steps', keyboard: TextInputType.number)),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(child: _field(waterCtrl, 'Water (ml)', keyboard: TextInputType.number)),
                    const SizedBox(width: 8),
                    Expanded(child: _field(exerciseCtrl, 'Exercise (min)', keyboard: TextInputType.number)),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(child: _field(weightCtrl, 'Weight (kg)', keyboard: const TextInputType.numberWithOptions(decimal: true))),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Mood', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12)),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: List.generate(5, (i) {
                              final n = i + 1;
                              return GestureDetector(
                                onTap: () => setS(() => mood = n),
                                child: CircleAvatar(
                                  radius: 14,
                                  backgroundColor: mood == n ? _moodColors[n] : const Color(0xFF1A1D2E),
                                  child: Text('$n', style: TextStyle(color: mood == n ? Colors.white : const Color(0xFF6B7280), fontSize: 11)),
                                ),
                              );
                            }),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                _field(notesCtrl, 'Notes (optional)'),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      final body = <String, dynamic>{};
                      if (sleepCtrl.text.isNotEmpty) body['sleep_hours'] = double.tryParse(sleepCtrl.text);
                      if (stepsCtrl.text.isNotEmpty) body['steps'] = int.tryParse(stepsCtrl.text);
                      if (waterCtrl.text.isNotEmpty) body['water_ml'] = int.tryParse(waterCtrl.text);
                      if (weightCtrl.text.isNotEmpty) body['weight_kg'] = double.tryParse(weightCtrl.text);
                      if (exerciseCtrl.text.isNotEmpty) body['exercise_minutes'] = int.tryParse(exerciseCtrl.text);
                      if (mood != null) body['mood'] = mood;
                      if (notesCtrl.text.isNotEmpty) body['notes'] = notesCtrl.text;
                      if (body.isEmpty) return;
                      await _service.logEntry(body);
                      if (ctx.mounted) Navigator.pop(ctx);
                      await _load();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6366F1),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Save', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String hint, {TextInputType keyboard = TextInputType.text}) =>
      TextField(
        controller: ctrl,
        keyboardType: keyboard,
        style: const TextStyle(color: Colors.white, fontSize: 13),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: Color(0xFF6B7280), fontSize: 12),
          filled: true,
          fillColor: const Color(0xFF1A1D2E),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final ins = _insights;
    return Scaffold(
      backgroundColor: const Color(0xFF060810),
      appBar: AppBar(
        backgroundColor: const Color(0xFF060810),
        title: const Text('Health', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
            : CustomScrollView(
                slivers: [
                  if (ins != null)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            GridView.count(
                              crossAxisCount: 2,
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              mainAxisSpacing: 8,
                              crossAxisSpacing: 8,
                              childAspectRatio: 2.2,
                              children: [
                                _InsightCard(label: 'Avg sleep', value: ins.avgSleep != null ? '${ins.avgSleep}h' : '—', icon: Icons.bedtime_outlined),
                                _InsightCard(label: 'Avg steps', value: ins.avgSteps != null ? ins.avgSteps!.toInt().toString() : '—', icon: Icons.directions_walk),
                                _InsightCard(label: 'Avg mood', value: ins.avgMood != null ? '${ins.avgMood!.toStringAsFixed(1)}/5' : '—', icon: Icons.sentiment_satisfied_alt),
                                _InsightCard(label: 'Exercise', value: ins.avgExercise != null ? '${ins.avgExercise!.toInt()}m' : '—', icon: Icons.fitness_center),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0D0F1A),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Tracking streak', style: TextStyle(color: Color(0xFF9CA3AF))),
                                  Text('${ins.streakDays} days', style: const TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.bold, fontSize: 16)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  _entries.isEmpty
                      ? SliverToBoxAdapter(
                          child: Container(
                            margin: const EdgeInsets.all(16),
                            padding: const EdgeInsets.all(32),
                            decoration: BoxDecoration(color: const Color(0xFF0D0F1A), borderRadius: BorderRadius.circular(16)),
                            child: const Center(
                              child: Text('No health data yet.\nTap + to log your first entry.',
                                  textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF6B7280))),
                            ),
                          ),
                        )
                      : SliverPadding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (ctx, i) {
                                final e = _entries[i];
                                return Container(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(color: const Color(0xFF0D0F1A), borderRadius: BorderRadius.circular(12)),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(e.date, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                                          if (e.mood != null)
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: _moodColors[e.mood!].withValues(alpha: 0.15),
                                                borderRadius: BorderRadius.circular(20),
                                              ),
                                              child: Text(_moodLabels[e.mood!], style: TextStyle(color: _moodColors[e.mood!], fontSize: 11, fontWeight: FontWeight.w500)),
                                            ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Wrap(
                                        spacing: 12,
                                        children: [
                                          if (e.sleepHours != null) _statChip(Icons.bedtime_outlined, '${e.sleepHours}h'),
                                          if (e.steps != null) _statChip(Icons.directions_walk, '${e.steps}'),
                                          if (e.waterMl != null) _statChip(Icons.water_drop_outlined, '${e.waterMl}ml'),
                                          if (e.exerciseMinutes != null) _statChip(Icons.fitness_center, '${e.exerciseMinutes}m'),
                                          if (e.weightKg != null) _statChip(Icons.monitor_weight_outlined, '${e.weightKg}kg'),
                                        ],
                                      ),
                                      if (e.notes != null) ...[
                                        const SizedBox(height: 4),
                                        Text(e.notes!, style: const TextStyle(color: Color(0xFF6B7280), fontSize: 12)),
                                      ],
                                    ],
                                  ),
                                );
                              },
                              childCount: _entries.length,
                            ),
                          ),
                        ),
                  const SliverToBoxAdapter(child: SizedBox(height: 100)),
                ],
              ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showLogSheet,
        backgroundColor: const Color(0xFF6366F1),
        child: const Icon(Icons.add, color: Colors.white),
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }

  Widget _statChip(IconData icon, String text) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 13, color: const Color(0xFF6366F1)),
      const SizedBox(width: 3),
      Text(text, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12)),
    ],
  );
}

class _InsightCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  const _InsightCard({required this.label, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    decoration: BoxDecoration(color: const Color(0xFF0D0F1A), borderRadius: BorderRadius.circular(12)),
    child: Row(
      children: [
        Icon(icon, color: const Color(0xFF6366F1), size: 20),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
            Text(label, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 11)),
          ],
        ),
      ],
    ),
  );
}
