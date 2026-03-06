import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../data/time_fingerprint_service.dart';

class TimeFingerprintScreen extends StatefulWidget {
  const TimeFingerprintScreen({super.key});

  @override
  State<TimeFingerprintScreen> createState() => _TimeFingerprintScreenState();
}

class _TimeFingerprintScreenState extends State<TimeFingerprintScreen> {
  final _service = TimeFingerprintService();
  ProductivityProfile? _profile;
  bool _loading = true;
  bool _noData = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final userId = Supabase.instance.client.auth.currentUser!.id;
    try {
      final profile = await _service.fetchProfile(userId);
      setState(() {
        _profile = profile;
        _noData = profile == null;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _loading = false;
        _noData = true;
      });
    }
  }

  String _formatHour(int h) {
    if (h == 0) return '12 AM';
    if (h < 12) return '$h AM';
    if (h == 12) return '12 PM';
    return '${h - 12} PM';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(title: const Text('Time Fingerprint')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _noData
              ? _buildNoData()
              : _buildProfile(),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }

  Widget _buildNoData() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.access_time_outlined, size: 48, color: AppColors.textTertiary.withValues(alpha: 0.5)),
            const SizedBox(height: 16),
            Text('Not enough data yet', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              'VitaMind needs at least 14 days of activity data to compute your productivity profile.',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfile() {
    final p = _profile!;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Peak hours
        GlassCard(
          borderColor: AppColors.primary.withValues(alpha: 0.2),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.bolt_outlined, size: 18, color: AppColors.primary),
                  ),
                  const SizedBox(width: 12),
                  Text('Peak Hours', style: Theme.of(context).textTheme.titleMedium),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: p.peakHours.map((h) => Chip(
                  label: Text(_formatHour(h)),
                  backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                  side: BorderSide(color: AppColors.primary.withValues(alpha: 0.3)),
                )).toList(),
              ),
            ],
          ),
        ),

        const SizedBox(height: 12),

        // Best window
        GlassCard(
          borderColor: AppColors.success.withValues(alpha: 0.2),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Best Focus Window', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Text(
                '${_formatHour(p.bestWindow['start'] ?? 9)} - ${_formatHour(p.bestWindow['end'] ?? 11)}',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: AppColors.success,
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 12),

        // Days
        Row(
          children: [
            Expanded(
              child: GlassCard(
                borderColor: AppColors.success.withValues(alpha: 0.2),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Best Days', style: Theme.of(context).textTheme.labelLarge?.copyWith(color: AppColors.success)),
                    const SizedBox(height: 6),
                    ...p.bestDays.map((d) => Padding(
                      padding: const EdgeInsets.only(bottom: 2),
                      child: Text(d, style: Theme.of(context).textTheme.bodyMedium),
                    )),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: GlassCard(
                borderColor: AppColors.error.withValues(alpha: 0.2),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Worst Days', style: Theme.of(context).textTheme.labelLarge?.copyWith(color: AppColors.error)),
                    const SizedBox(height: 6),
                    ...p.worstDays.map((d) => Padding(
                      padding: const EdgeInsets.only(bottom: 2),
                      child: Text(d, style: Theme.of(context).textTheme.bodyMedium),
                    )),
                  ],
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 12),

        // Habit rates
        GlassCard(
          borderColor: AppColors.secondary.withValues(alpha: 0.2),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Habit Completion by Time', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              _buildRateBar('Morning', p.morningHabitRate, AppColors.warning),
              const SizedBox(height: 8),
              _buildRateBar('Evening', p.eveningHabitRate, AppColors.secondary),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRateBar(String label, double rate, Color color) {
    return Row(
      children: [
        SizedBox(width: 70, child: Text(label, style: Theme.of(context).textTheme.bodyMedium)),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: rate,
              backgroundColor: AppColors.border,
              color: color,
              minHeight: 8,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text('${(rate * 100).round()}%', style: Theme.of(context).textTheme.labelSmall),
      ],
    );
  }
}
