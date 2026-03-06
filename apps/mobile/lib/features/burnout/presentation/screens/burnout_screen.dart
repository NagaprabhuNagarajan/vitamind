import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../data/burnout_service.dart';

class BurnoutScreen extends StatefulWidget {
  const BurnoutScreen({super.key});

  @override
  State<BurnoutScreen> createState() => _BurnoutScreenState();
}

class _BurnoutScreenState extends State<BurnoutScreen> {
  final _service = BurnoutService();
  BurnoutAlert? _alert;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final userId = Supabase.instance.client.auth.currentUser!.id;
    try {
      final alert = await _service.fetchLatest(userId);
      setState(() {
        _alert = alert;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _acknowledge() async {
    if (_alert == null) return;
    await _service.acknowledge(_alert!.id);
    setState(() => _alert = _alert!.copyWith(acknowledged: true));
  }

  Color _riskColor(int risk) {
    if (risk >= 70) return AppColors.error;
    if (risk >= 40) return AppColors.warning;
    return AppColors.success;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(title: const Text('Burnout Radar')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _alert == null
              ? _buildNoData()
              : _buildAlert(),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }

  Widget _buildNoData() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.shield_outlined, size: 48, color: AppColors.success.withValues(alpha: 0.5)),
          const SizedBox(height: 16),
          Text('No burnout risk detected', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text('Keep up the great work!', style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }

  Widget _buildAlert() {
    final a = _alert!;
    final color = _riskColor(a.riskLevel);
    final signals = a.signals;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Risk score
        GlassCard(
          borderColor: color.withValues(alpha: 0.3),
          child: Column(
            children: [
              Text('Burnout Risk', style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 8),
              Text(
                '${a.riskLevel}',
                style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      color: color,
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                a.riskLevel >= 70
                    ? 'High Risk'
                    : a.riskLevel >= 40
                        ? 'Moderate Risk'
                        : 'Low Risk',
                style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Signals
        Text('Signals', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        ...signals.entries.map((e) {
          final active = e.value == true || (e.value is num && (e.value as num) > 0);
          return Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(
              children: [
                Icon(
                  active ? Icons.warning_amber_rounded : Icons.check_circle_outline,
                  size: 18,
                  color: active ? AppColors.warning : AppColors.success,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    e.key.replaceAll('_', ' '),
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
              ],
            ),
          );
        }),

        if (a.recoveryPlan != null) ...[
          const SizedBox(height: 16),
          Text('Recovery Plan', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          GlassCard(
            borderColor: AppColors.primary.withValues(alpha: 0.2),
            child: Text(a.recoveryPlan!, style: Theme.of(context).textTheme.bodyMedium),
          ),
        ],

        if (!a.acknowledged) ...[
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _acknowledge,
            child: const Text('Acknowledge'),
          ),
        ],
      ],
    );
  }
}
