import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/cache/cache_service.dart';

/// Represents a user's score and metadata for a single life domain.
class DomainScore {
  final String domain;
  final double score;
  final int goalCount;
  final List<Map<String, dynamic>> activeGoals;
  final String? topInsight;

  const DomainScore({
    required this.domain,
    required this.score,
    required this.goalCount,
    required this.activeGoals,
    this.topInsight,
  });

  Map<String, dynamic> toMap() => {
        'domain': domain,
        'score': score,
        'goalCount': goalCount,
        'activeGoals': activeGoals,
        'topInsight': topInsight,
      };

  factory DomainScore.fromMap(Map<String, dynamic> m) => DomainScore(
        domain: m['domain'] as String,
        score: (m['score'] as num).toDouble(),
        goalCount: m['goalCount'] as int,
        activeGoals: (m['activeGoals'] as List<dynamic>)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList(),
        topInsight: m['topInsight'] as String?,
      );
}

/// Computes life-domain scores by combining goal progress, task completion,
/// and habit completion rates from Supabase. Results are cached for 1 hour
/// to avoid redundant queries on frequent screen visits.
class LifeMapService {
  final _supabase = Supabase.instance.client;

  static const _cacheKey = 'life_map_scores';
  static const _cacheTtl = Duration(hours: 1);

  static const domains = [
    'health',
    'career',
    'relationships',
    'finance',
    'learning',
    'personal',
  ];

  /// Returns domain scores for all 6 life domains.
  ///
  /// Tries cache first (1-hour TTL), then falls back to network.
  /// On network failure, serves stale cache if available.
  Future<List<DomainScore>> getScores() async {
    final userId = _supabase.auth.currentUser!.id;
    final cacheTag = '${_cacheKey}_$userId';

    // Serve from cache if fresh.
    final cached = await CacheService.load<List<dynamic>>(
      cacheTag,
      maxAge: _cacheTtl,
    );
    if (cached != null) {
      debugPrint('LifeMapService: serving cached scores');
      return cached
          .map((m) => DomainScore.fromMap(Map<String, dynamic>.from(m as Map)))
          .toList();
    }

    try {
      final scores = await _computeScores(userId);

      await CacheService.save(
        cacheTag,
        scores.map((s) => s.toMap()).toList(),
      );

      return scores;
    } catch (e) {
      debugPrint('LifeMapService.getScores failed: $e');
      rethrow;
    }
  }

  /// Forces a fresh computation, bypassing cache.
  Future<List<DomainScore>> refresh() async {
    final userId = _supabase.auth.currentUser!.id;
    final cacheTag = '${_cacheKey}_$userId';
    await CacheService.clear(cacheTag);
    return getScores();
  }

  // ---------------------------------------------------------------------------
  // Score computation
  // ---------------------------------------------------------------------------

  Future<List<DomainScore>> _computeScores(String userId) async {
    // Fetch all data in parallel to minimize latency.
    final results = await Future.wait([
      _fetchGoals(userId),
      _fetchTasks(userId),
      _fetchHabitCompletionRate(userId),
    ]);

    final goals = results[0] as List<Map<String, dynamic>>;
    final tasks = results[1] as List<Map<String, dynamic>>;
    final habitRate = results[2] as double;

    // Index goals and tasks by domain for efficient lookup.
    final goalsByDomain = <String, List<Map<String, dynamic>>>{};
    for (final goal in goals) {
      final domain = goal['domain'] as String?;
      if (domain != null && domains.contains(domain)) {
        goalsByDomain.putIfAbsent(domain, () => []).add(goal);
      }
    }

    // Map goal IDs to their domain for task grouping.
    final goalIdToDomain = <String, String>{};
    for (final goal in goals) {
      final domain = goal['domain'] as String?;
      if (domain != null) {
        goalIdToDomain[goal['id'] as String] = domain;
      }
    }

    // Group tasks by domain via their linked goal.
    final tasksByDomain = <String, List<Map<String, dynamic>>>{};
    for (final task in tasks) {
      final goalId = task['goal_id'] as String?;
      if (goalId != null && goalIdToDomain.containsKey(goalId)) {
        final domain = goalIdToDomain[goalId]!;
        tasksByDomain.putIfAbsent(domain, () => []).add(task);
      }
    }

    return domains.map((domain) {
      final domainGoals = goalsByDomain[domain] ?? [];
      final domainTasks = tasksByDomain[domain] ?? [];

      final activeGoals = domainGoals
          .where((g) => g['is_completed'] != true)
          .toList();

      final score = _calculateDomainScore(
        domainGoals: domainGoals,
        domainTasks: domainTasks,
        habitRate: habitRate,
      );

      final insight = _generateInsight(
        domain: domain,
        score: score,
        goalCount: domainGoals.length,
      );

      return DomainScore(
        domain: domain,
        score: score,
        goalCount: domainGoals.length,
        activeGoals: activeGoals.map((g) => {
              'id': g['id'],
              'title': g['title'],
              'progress': g['progress'] ?? 0,
            }).toList(),
        topInsight: insight,
      );
    }).toList();
  }

  /// Weighted score: goal progress (50%), task completion (30%), habits (20%).
  double _calculateDomainScore({
    required List<Map<String, dynamic>> domainGoals,
    required List<Map<String, dynamic>> domainTasks,
    required double habitRate,
  }) {
    // Goal progress: average progress of non-completed goals (0-100).
    final activeGoals =
        domainGoals.where((g) => g['is_completed'] != true).toList();
    final goalProgress = activeGoals.isEmpty
        ? 0.0
        : activeGoals.fold<double>(
              0.0,
              (sum, g) => sum + ((g['progress'] as num?)?.toDouble() ?? 0.0),
            ) /
            activeGoals.length;

    // Task completion rate: completed / total (0-100).
    final totalTasks = domainTasks.length;
    final completedTasks =
        domainTasks.where((t) => t['status'] == 'completed').length;
    final taskRate =
        totalTasks == 0 ? 0.0 : (completedTasks / totalTasks) * 100;

    // Combine with weights.
    final score =
        (goalProgress * 0.5) + (taskRate * 0.3) + (habitRate * 0.2);

    return score.clamp(0.0, 100.0);
  }

  /// Template-based insight generation -- no AI needed.
  String _generateInsight({
    required String domain,
    required double score,
    required int goalCount,
  }) {
    final label = domain[0].toUpperCase() + domain.substring(1);

    if (goalCount == 0) {
      return 'No goals set for this domain yet';
    }
    if (score >= 80) {
      return 'Excellent progress in $label!';
    }
    if (score >= 50) {
      return '$label is on track';
    }
    // score < 50 with goals
    return '$label needs attention';
  }

  // ---------------------------------------------------------------------------
  // Data fetchers
  // ---------------------------------------------------------------------------

  /// Fetches all goals for the user (we need domain, progress, is_completed).
  Future<List<Map<String, dynamic>>> _fetchGoals(String userId) async {
    try {
      final data = await _supabase
          .from('goals')
          .select('id, title, domain, progress, is_completed')
          .eq('user_id', userId);

      return (data as List).cast<Map<String, dynamic>>();
    } catch (e) {
      debugPrint('LifeMapService._fetchGoals failed: $e');
      return [];
    }
  }

  /// Fetches all tasks linked to a goal (need goal_id, status).
  Future<List<Map<String, dynamic>>> _fetchTasks(String userId) async {
    try {
      final data = await _supabase
          .from('tasks')
          .select('id, goal_id, status')
          .eq('user_id', userId)
          .not('goal_id', 'is', null);

      return (data as List).cast<Map<String, dynamic>>();
    } catch (e) {
      debugPrint('LifeMapService._fetchTasks failed: $e');
      return [];
    }
  }

  /// Computes overall habit completion rate over the last 30 days as a
  /// percentage (0-100). Used as a proxy for all domains since habits
  /// are not domain-tagged.
  Future<double> _fetchHabitCompletionRate(String userId) async {
    try {
      final thirtyDaysAgo =
          DateTime.now().subtract(const Duration(days: 30));
      final fromDate = thirtyDaysAgo.toIso8601String().substring(0, 10);

      final logs = await _supabase
          .from('habit_logs')
          .select('status')
          .eq('user_id', userId)
          .gte('date', fromDate);

      final logList = logs as List;
      if (logList.isEmpty) return 0.0;

      final completed =
          logList.where((l) => l['status'] == 'completed').length;
      return (completed / logList.length) * 100;
    } catch (e) {
      debugPrint('LifeMapService._fetchHabitCompletionRate failed: $e');
      return 0.0;
    }
  }
}
