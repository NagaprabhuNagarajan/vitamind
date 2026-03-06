import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/cache_service.dart';

class GoalPlan {
  final String id;
  final String goalId;
  final String userId;
  final int weekNumber;
  final List<Map<String, dynamic>> tasks;
  final List<Map<String, dynamic>> suggestedHabits;
  final DateTime createdAt;

  const GoalPlan({
    required this.id,
    required this.goalId,
    required this.userId,
    required this.weekNumber,
    required this.tasks,
    required this.suggestedHabits,
    required this.createdAt,
  });

  factory GoalPlan.fromMap(Map<String, dynamic> m) => GoalPlan(
        id: m['id'] as String,
        goalId: m['goal_id'] as String,
        userId: m['user_id'] as String,
        weekNumber: (m['week_number'] as num?)?.toInt() ?? 0,
        tasks: _parseJsonList(m['tasks']),
        suggestedHabits: _parseJsonList(m['suggested_habits']),
        createdAt: DateTime.parse(m['created_at'] as String),
      );

  Map<String, dynamic> toMap() => {
        'id': id,
        'goal_id': goalId,
        'user_id': userId,
        'week_number': weekNumber,
        'tasks': tasks,
        'suggested_habits': suggestedHabits,
        'created_at': createdAt.toIso8601String(),
      };

  GoalPlan copyWith({
    int? weekNumber,
    List<Map<String, dynamic>>? tasks,
    List<Map<String, dynamic>>? suggestedHabits,
  }) =>
      GoalPlan(
        id: id,
        goalId: goalId,
        userId: userId,
        weekNumber: weekNumber ?? this.weekNumber,
        tasks: tasks ?? this.tasks,
        suggestedHabits: suggestedHabits ?? this.suggestedHabits,
        createdAt: createdAt,
      );

  /// Safely parses a JSONB array column into a typed list.
  static List<Map<String, dynamic>> _parseJsonList(dynamic raw) {
    if (raw is List) {
      return raw
          .map((e) => e is Map<String, dynamic>
              ? e
              : (e as Map).cast<String, dynamic>())
          .toList();
    }
    return [];
  }
}

class GoalAutopilotService {
  final _supabase = Supabase.instance.client;

  static String _plansCacheKey(String userId) => 'goal_plans_$userId';
  static String _autopilotGoalsCacheKey(String userId) =>
      'autopilot_goals_$userId';

  /// Fetches all goal plans for the user, most recent first.
  Future<List<GoalPlan>> fetchPlans(String userId) async {
    final cacheKey = _plansCacheKey(userId);

    try {
      final data = await _supabase
          .from('goal_plans')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false);

      final plans = (data as List)
          .map((m) => GoalPlan.fromMap(m as Map<String, dynamic>))
          .toList();

      await CacheService.save(
        cacheKey,
        plans.map((p) => p.toMap()).toList(),
      );

      return plans;
    } catch (e) {
      debugPrint('GoalAutopilotService.fetchPlans failed: $e');

      final cached = await CacheService.load<List<dynamic>>(cacheKey);
      if (cached != null) {
        debugPrint('GoalAutopilotService: serving cached plans');
        return cached
            .map((m) => GoalPlan.fromMap(m as Map<String, dynamic>))
            .toList();
      }
      rethrow;
    }
  }

  /// Enables or disables autopilot mode for a goal.
  Future<void> toggleAutopilot(String goalId, bool enabled) async {
    await _supabase
        .from('goals')
        .update({'autopilot_enabled': enabled})
        .eq('id', goalId);
  }

  /// Fetches all goals that have autopilot enabled.
  Future<List<Map<String, dynamic>>> getAutopilotGoals(
      String userId) async {
    final cacheKey = _autopilotGoalsCacheKey(userId);

    try {
      final data = await _supabase
          .from('goals')
          .select()
          .eq('user_id', userId)
          .eq('autopilot_enabled', true)
          .order('created_at', ascending: false);

      final goals = (data as List)
          .map((m) => m as Map<String, dynamic>)
          .toList();

      await CacheService.save(cacheKey, goals);

      return goals;
    } catch (e) {
      debugPrint('GoalAutopilotService.getAutopilotGoals failed: $e');

      final cached = await CacheService.load<List<dynamic>>(cacheKey);
      if (cached != null) {
        return cached
            .map((m) => m as Map<String, dynamic>)
            .toList();
      }
      rethrow;
    }
  }
}
