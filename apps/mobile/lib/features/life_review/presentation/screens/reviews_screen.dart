import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../life_review/data/life_review_service.dart';

/// Lists all monthly Life Reviews and lets the user drill into a detailed
/// view with stats and the full AI-generated report.
class ReviewsScreen extends StatefulWidget {
  const ReviewsScreen({super.key});

  @override
  State<ReviewsScreen> createState() => _ReviewsScreenState();
}

class _ReviewsScreenState extends State<ReviewsScreen> {
  final _service = LifeReviewService();

  List<LifeReview> _reviews = [];
  bool _loading = true;
  String? _error;

  /// Tracks which months are currently being generated.
  final Set<String> _generating = {};

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
      final userId = Supabase.instance.client.auth.currentUser!.id;
      final reviews = await _service.fetchAll(userId);

      if (!mounted) return;
      setState(() {
        _reviews = reviews;
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

  /// Returns YYYY-MM strings for months that have no review yet.
  /// Covers the last 6 months so the user can generate recent reviews.
  List<String> _availableMonths() {
    final existing = _reviews.map((r) => r.month).toSet();
    final available = <String>[];
    final now = DateTime.now();

    for (var i = 1; i <= 6; i++) {
      final d = DateTime(now.year, now.month - i, 1);
      final key =
          '${d.year}-${d.month.toString().padLeft(2, '0')}';
      if (!existing.contains(key)) {
        available.add(key);
      }
    }
    return available;
  }

  String _monthLabel(String yyyyMm) {
    final parts = yyyyMm.split('-');
    const names = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    final month = int.parse(parts[1]);
    return '${names[month - 1]} ${parts[0]}';
  }

  void _openDetail(LifeReview review) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _ReviewDetailPage(review: review),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: const Text('Life Reviews'),
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
          Text('Failed to load reviews',
              style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _load, child: const Text('Retry')),
        ],
      ),
    );
  }

  Widget _buildBody() {
    final available = _availableMonths();
    final hasContent = _reviews.isNotEmpty || available.isNotEmpty;

    if (!hasContent) return _buildEmpty();

    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      backgroundColor: AppColors.surface,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: [
          // -- Existing reviews --
          if (_reviews.isNotEmpty) ...[
            Text('Past Reviews',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            ..._reviews.map((r) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _ReviewCard(
                    review: r,
                    onTap: () => _openDetail(r),
                  ),
                )),
          ],

          // -- Generate buttons for missing months --
          if (available.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text('Generate Review',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            ...available.map((month) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _GenerateCard(
                    label: _monthLabel(month),
                    generating: _generating.contains(month),
                    onGenerate: () => _handleGenerate(month),
                  ),
                )),
          ],

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
            Icon(Icons.auto_stories_outlined,
                size: 56,
                color: AppColors.textTertiary.withValues(alpha: 0.5)),
            const SizedBox(height: 16),
            Text('No reviews yet',
                style: Theme.of(context).textTheme.titleMedium,
                textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(
              'Life reviews are monthly AI summaries of your productivity. Use VitaMind for a full month to unlock your first review.',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleGenerate(String month) async {
    setState(() => _generating.add(month));

    try {
      final userId = Supabase.instance.client.auth.currentUser!.id;
      await _service.fetchByMonth(userId, month);

      // Reload the list which will pick up any server-side review that
      // was generated asynchronously or already exists.
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to generate review: $e')),
      );
    } finally {
      if (mounted) setState(() => _generating.remove(month));
    }
  }
}

// ---------------------------------------------------------------------------
// Private widgets
// ---------------------------------------------------------------------------

/// Summary card for an existing review -- shows month and key stats.
class _ReviewCard extends StatelessWidget {
  final LifeReview review;
  final VoidCallback onTap;

  const _ReviewCard({required this.review, required this.onTap});

  String _monthLabel() {
    final parts = review.month.split('-');
    const names = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    final m = int.parse(parts[1]);
    return '${names[m - 1]} ${parts[0]}';
  }

  @override
  Widget build(BuildContext context) {
    final data = review.data;
    final tasks = data['tasks_completed'] ?? '-';
    final completion = data['completion_rate'] != null
        ? '${((data['completion_rate'] as num) * 100).round()}%'
        : '-';
    final habitRate = data['habit_rate'] != null
        ? '${((data['habit_rate'] as num) * 100).round()}%'
        : '-';
    final momentum = data['avg_momentum'] ?? '-';

    return GlassCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(_monthLabel(),
                  style: Theme.of(context).textTheme.titleMedium),
              const Icon(Icons.chevron_right_rounded,
                  size: 20, color: AppColors.textTertiary),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _MiniStat(label: 'Tasks', value: '$tasks'),
              _MiniStat(label: 'Done', value: completion),
              _MiniStat(label: 'Habits', value: habitRate),
              _MiniStat(label: 'Score', value: '$momentum'),
            ],
          ),
        ],
      ),
    );
  }
}

/// Tiny stat column used inside the review card.
class _MiniStat extends StatelessWidget {
  final String label;
  final String value;
  const _MiniStat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(value,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(color: AppColors.primary)),
          const SizedBox(height: 2),
          Text(label,
              style: Theme.of(context)
                  .textTheme
                  .labelSmall
                  ?.copyWith(fontSize: 10)),
        ],
      ),
    );
  }
}

/// Card that triggers generation of a missing month's review.
class _GenerateCard extends StatelessWidget {
  final String label;
  final bool generating;
  final VoidCallback onGenerate;

  const _GenerateCard({
    required this.label,
    required this.generating,
    required this.onGenerate,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      onTap: generating ? null : onGenerate,
      borderColor: AppColors.secondary.withValues(alpha: 0.25),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.secondary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.auto_awesome_outlined,
                size: 18, color: AppColors.secondary),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(label,
                style: Theme.of(context).textTheme.labelLarge),
          ),
          if (generating)
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                  strokeWidth: 2, color: AppColors.secondary),
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.secondary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Generate',
                style: Theme.of(context)
                    .textTheme
                    .labelSmall
                    ?.copyWith(color: AppColors.secondary),
              ),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Detail page (pushed via Navigator so it has its own app bar / back button)
// ---------------------------------------------------------------------------

/// Full-screen detail view for a single life review showing stats and the
/// complete AI report.
class _ReviewDetailPage extends StatelessWidget {
  final LifeReview review;
  const _ReviewDetailPage({required this.review});

  String _monthLabel() {
    final parts = review.month.split('-');
    const names = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    final m = int.parse(parts[1]);
    return '${names[m - 1]} ${parts[0]}';
  }

  @override
  Widget build(BuildContext context) {
    final data = review.data;
    final tasks = data['tasks_completed'] ?? 0;
    final completion = data['completion_rate'] != null
        ? '${((data['completion_rate'] as num) * 100).round()}%'
        : '-';
    final habitRate = data['habit_rate'] != null
        ? '${((data['habit_rate'] as num) * 100).round()}%'
        : '-';
    final momentum = data['avg_momentum'] ?? 0;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: Text(_monthLabel()),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: [
          // Stats row
          GlassCard(
            child: Row(
              children: [
                _DetailStat(
                    label: 'Tasks', value: '$tasks', color: AppColors.primary),
                _DetailStat(
                    label: 'Done', value: completion, color: AppColors.success),
                _DetailStat(
                    label: 'Habits',
                    value: habitRate,
                    color: AppColors.accent),
                _DetailStat(
                    label: 'Momentum',
                    value: '$momentum',
                    color: AppColors.secondary),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // AI Report
          Text('AI Report',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          GlassCard(
            borderColor: AppColors.secondary.withValues(alpha: 0.2),
            child: SelectableText(
              review.report,
              style: Theme.of(context)
                  .textTheme
                  .bodyLarge
                  ?.copyWith(height: 1.6),
            ),
          ),

          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _DetailStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _DetailStat({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(color: color, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(label,
              style: Theme.of(context)
                  .textTheme
                  .labelSmall
                  ?.copyWith(fontSize: 11)),
        ],
      ),
    );
  }
}
