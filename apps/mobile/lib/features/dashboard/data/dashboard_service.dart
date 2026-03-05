import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/cache_service.dart';

class DashboardData {
  final int tasksDueToday;
  final int tasksCompleted;
  final int activeGoals;
  final int habitsCheckedToday;
  final int totalHabits;
  final String? latestInsight;
  final bool isFromCache;

  const DashboardData({
    required this.tasksDueToday,
    required this.tasksCompleted,
    required this.activeGoals,
    required this.habitsCheckedToday,
    required this.totalHabits,
    this.latestInsight,
    this.isFromCache = false,
  });

  Map<String, dynamic> toMap() => {
        'tasksDueToday': tasksDueToday,
        'tasksCompleted': tasksCompleted,
        'activeGoals': activeGoals,
        'habitsCheckedToday': habitsCheckedToday,
        'totalHabits': totalHabits,
        'latestInsight': latestInsight,
      };

  factory DashboardData.fromCacheMap(Map<String, dynamic> m) => DashboardData(
        tasksDueToday: (m['tasksDueToday'] as num?)?.toInt() ?? 0,
        tasksCompleted: (m['tasksCompleted'] as num?)?.toInt() ?? 0,
        activeGoals: (m['activeGoals'] as num?)?.toInt() ?? 0,
        habitsCheckedToday: (m['habitsCheckedToday'] as num?)?.toInt() ?? 0,
        totalHabits: (m['totalHabits'] as num?)?.toInt() ?? 0,
        latestInsight: m['latestInsight'] as String?,
        isFromCache: true,
      );
}

class DashboardService {
  final _supabase = Supabase.instance.client;

  static const _dashboardCacheTtl = Duration(hours: 1);

  static String _cacheKey(String userId) => 'dashboard_$userId';

  Future<DashboardData> fetch(String userId) async {
    final cacheKey = _cacheKey(userId);

    try {
      final data = await _fetchFromNetwork(userId);

      // Cache with a shorter TTL (1 hour) since dashboard stats change often.
      await CacheService.save(cacheKey, data.toMap());

      return data;
    } catch (e) {
      final cached = await CacheService.load<Map<String, dynamic>>(
        cacheKey,
        maxAge: _dashboardCacheTtl,
      );
      if (cached != null) {
        debugPrint('DashboardService: serving cached data for $cacheKey');
        return DashboardData.fromCacheMap(cached);
      }
      rethrow;
    }
  }

  Future<DashboardData> _fetchFromNetwork(String userId) async {
    final today = DateTime.now();
    final todayStr =
        '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

    final dueTasks = await _safeCount(() => _supabase
        .from('tasks')
        .select('id')
        .eq('user_id', userId)
        .neq('status', 'completed')
        .lte('due_date', todayStr));

    final completedToday = await _safeCount(() => _supabase
        .from('tasks')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('completed_at', '${todayStr}T00:00:00'));

    final activeGoals = await _safeCount(() => _supabase
        .from('goals')
        .select('id')
        .eq('user_id', userId)
        .eq('is_completed', false));

    final totalHabits = await _safeCount(() => _supabase
        .from('habits')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true));

    final habitsChecked = await _safeCount(() => _supabase
        .from('habit_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('date', todayStr)
        .eq('status', 'completed'));

    String? latestInsight;
    try {
      final insights = await _supabase
          .from('ai_insights')
          .select('content')
          .eq('user_id', userId)
          .eq('insight_type', 'daily_plan')
          .order('generated_at', ascending: false)
          .limit(1);
      if (insights.isNotEmpty) {
        latestInsight =
            (insights.first as Map<String, dynamic>)['content'] as String?;
      }
    } catch (e) {
      debugPrint('DashboardService: ai_insights query failed — $e');
    }

    return DashboardData(
      tasksDueToday: dueTasks,
      tasksCompleted: completedToday,
      activeGoals: activeGoals,
      habitsCheckedToday: habitsChecked,
      totalHabits: totalHabits,
      latestInsight: latestInsight,
    );
  }

  /// Runs a Supabase list query and returns the row count, or 0 on error.
  Future<int> _safeCount(Future<dynamic> Function() query) async {
    try {
      final result = await query();
      return (result as List).length;
    } catch (e) {
      debugPrint('DashboardService: query failed — $e');
      return 0;
    }
  }
}
