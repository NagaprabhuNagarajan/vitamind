import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/cache_service.dart';

class CascadeEvent {
  final String id;
  final String habitId;
  final String habitTitle;
  final List<Map<String, dynamic>> affectedGoals; // from JSONB column
  final String? suggestion;
  final bool acknowledged;
  final DateTime createdAt;

  const CascadeEvent({
    required this.id,
    required this.habitId,
    required this.habitTitle,
    required this.affectedGoals,
    this.suggestion,
    required this.acknowledged,
    required this.createdAt,
  });

  factory CascadeEvent.fromMap(Map<String, dynamic> m) {
    // Joined habit data arrives as nested object from Supabase select
    final habit = m['habits'] as Map<String, dynamic>?;

    // affected_goals is a JSONB array column
    final rawGoals = m['affected_goals'];
    final goals = rawGoals is List
        ? rawGoals.map((e) => e is Map<String, dynamic> ? e : <String, dynamic>{}).toList()
        : <Map<String, dynamic>>[];

    return CascadeEvent(
      id: m['id'] as String,
      habitId: m['habit_id'] as String,
      habitTitle: habit?['title'] as String? ?? '',
      affectedGoals: goals,
      suggestion: m['suggestion'] as String?,
      acknowledged: m['acknowledged'] as bool? ?? false,
      createdAt: DateTime.parse(m['created_at'] as String),
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'habit_id': habitId,
        'habit_title': habitTitle,
        'affected_goals': affectedGoals,
        'suggestion': suggestion,
        'acknowledged': acknowledged,
        'created_at': createdAt.toIso8601String(),
      };

  CascadeEvent copyWith({bool? acknowledged}) => CascadeEvent(
        id: id,
        habitId: habitId,
        habitTitle: habitTitle,
        affectedGoals: affectedGoals,
        suggestion: suggestion,
        acknowledged: acknowledged ?? this.acknowledged,
        createdAt: createdAt,
      );
}

class HabitGoalLink {
  final String id;
  final String habitId;
  final String goalId;
  final double impactWeight;

  const HabitGoalLink({
    required this.id,
    required this.habitId,
    required this.goalId,
    required this.impactWeight,
  });

  factory HabitGoalLink.fromMap(Map<String, dynamic> m) => HabitGoalLink(
        id: m['id'] as String,
        habitId: m['habit_id'] as String,
        goalId: m['goal_id'] as String,
        impactWeight: (m['impact_weight'] as num?)?.toDouble() ?? 1.0,
      );

  Map<String, dynamic> toMap() => {
        'id': id,
        'habit_id': habitId,
        'goal_id': goalId,
        'impact_weight': impactWeight,
      };

  HabitGoalLink copyWith({double? impactWeight}) => HabitGoalLink(
        id: id,
        habitId: habitId,
        goalId: goalId,
        impactWeight: impactWeight ?? this.impactWeight,
      );
}

class CascadeService {
  final _supabase = Supabase.instance.client;

  static String _cascadeCacheKey(String userId) => 'cascades_$userId';
  static String _linksCacheKey(String userId) => 'habit_goal_links_$userId';

  /// Fetches unacknowledged cascade events with joined habit/goal titles.
  Future<List<CascadeEvent>> fetchCascades(String userId) async {
    final cacheKey = _cascadeCacheKey(userId);

    try {
      final data = await _supabase
          .from('cascade_events')
          .select('*, habits(title)')
          .eq('user_id', userId)
          .eq('acknowledged', false)
          .order('created_at', ascending: false);

      final events = (data as List)
          .map((m) => CascadeEvent.fromMap(m as Map<String, dynamic>))
          .toList();

      await CacheService.save(
        cacheKey,
        events.map((e) => e.toMap()).toList(),
      );

      return events;
    } catch (e) {
      debugPrint('CascadeService.fetchCascades failed: $e');

      final cached = await CacheService.load<List<dynamic>>(cacheKey);
      if (cached != null) {
        debugPrint('CascadeService: serving cached cascades');
        return cached
            .map((m) => CascadeEvent.fromMap(m as Map<String, dynamic>))
            .toList();
      }
      rethrow;
    }
  }

  /// Marks a cascade event as acknowledged so it no longer appears.
  Future<void> acknowledge(String eventId) async {
    await _supabase
        .from('cascade_events')
        .update({'acknowledged': true})
        .eq('id', eventId);
  }

  /// Fetches all habit-goal links for the user.
  Future<List<HabitGoalLink>> fetchLinks(String userId) async {
    final cacheKey = _linksCacheKey(userId);

    try {
      final data = await _supabase
          .from('habit_goal_links')
          .select()
          .eq('user_id', userId);

      final links = (data as List)
          .map((m) => HabitGoalLink.fromMap(m as Map<String, dynamic>))
          .toList();

      await CacheService.save(
        cacheKey,
        links.map((l) => l.toMap()).toList(),
      );

      return links;
    } catch (e) {
      debugPrint('CascadeService.fetchLinks failed: $e');

      final cached = await CacheService.load<List<dynamic>>(cacheKey);
      if (cached != null) {
        return cached
            .map((m) => HabitGoalLink.fromMap(m as Map<String, dynamic>))
            .toList();
      }
      rethrow;
    }
  }

  /// Creates a link between a habit and a goal with an impact weight.
  Future<void> linkHabitToGoal(
    String userId,
    String habitId,
    String goalId,
    double weight,
  ) async {
    await _supabase.from('habit_goal_links').insert({
      'user_id': userId,
      'habit_id': habitId,
      'goal_id': goalId,
      'impact_weight': weight,
    });
  }

  /// Removes a habit-goal link.
  Future<void> unlinkHabitFromGoal(String linkId) async {
    await _supabase.from('habit_goal_links').delete().eq('id', linkId);
  }
}
