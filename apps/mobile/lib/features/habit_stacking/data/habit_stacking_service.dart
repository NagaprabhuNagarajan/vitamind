import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/cache_service.dart';

class HabitStack {
  final String id;
  final String userId;
  final String name;
  final List<String> habitIds;
  final String? triggerTime; // HH:MM format
  final DateTime createdAt;

  const HabitStack({
    required this.id,
    required this.userId,
    required this.name,
    required this.habitIds,
    this.triggerTime,
    required this.createdAt,
  });

  factory HabitStack.fromMap(Map<String, dynamic> m) => HabitStack(
        id: m['id'] as String,
        userId: m['user_id'] as String,
        name: m['name'] as String,
        habitIds: (m['habit_ids'] as List<dynamic>? ?? [])
            .map((e) => e as String)
            .toList(),
        triggerTime: m['suggested_time'] as String?,
        createdAt: DateTime.parse(m['created_at'] as String),
      );

  Map<String, dynamic> toMap() => {
        'id': id,
        'user_id': userId,
        'name': name,
        'habit_ids': habitIds,
        'suggested_time': triggerTime,
        'created_at': createdAt.toIso8601String(),
      };

  HabitStack copyWith({
    String? name,
    List<String>? habitIds,
    String? triggerTime,
  }) =>
      HabitStack(
        id: id,
        userId: userId,
        name: name ?? this.name,
        habitIds: habitIds ?? this.habitIds,
        triggerTime: triggerTime ?? this.triggerTime,
        createdAt: createdAt,
      );
}

class HabitStackingService {
  final _supabase = Supabase.instance.client;

  static String _cacheKey(String userId) => 'habit_stacks_$userId';

  /// Fetches all habit stacks for the user.
  Future<List<HabitStack>> fetchStacks(String userId) async {
    final cacheKey = _cacheKey(userId);

    try {
      final data = await _supabase
          .from('habit_stacks')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false);

      final stacks = (data as List)
          .map((m) => HabitStack.fromMap(m as Map<String, dynamic>))
          .toList();

      await CacheService.save(
        cacheKey,
        stacks.map((s) => s.toMap()).toList(),
      );

      return stacks;
    } catch (e) {
      debugPrint('HabitStackingService.fetchStacks failed: $e');

      final cached = await CacheService.load<List<dynamic>>(cacheKey);
      if (cached != null) {
        debugPrint('HabitStackingService: serving cached stacks');
        return cached
            .map((m) => HabitStack.fromMap(m as Map<String, dynamic>))
            .toList();
      }
      rethrow;
    }
  }

  /// Creates a new habit stack (ordered group of habits to do together).
  Future<void> createStack(
    String userId,
    String name,
    List<String> habitIds, {
    String? triggerTime,
  }) async {
    await _supabase.from('habit_stacks').insert({
      'user_id': userId,
      'name': name,
      'habit_ids': habitIds,
      if (triggerTime != null) 'suggested_time': triggerTime,
    });
  }

  /// Deletes a habit stack.
  Future<void> deleteStack(String stackId) async {
    await _supabase.from('habit_stacks').delete().eq('id', stackId);
  }

  /// Completes all habits in a stack by logging each one for today.
  /// Uses upsert to avoid duplicates if a habit was already logged.
  Future<void> completeStack(String userId, String stackId) async {
    // Fetch the stack to get habit IDs
    final data = await _supabase
        .from('habit_stacks')
        .select('habit_ids')
        .eq('id', stackId)
        .single();

    final habitIds = (data['habit_ids'] as List<dynamic>)
        .map((e) => e as String)
        .toList();

    final today = _todayStr();

    // Upsert a completed log for each habit in the stack
    final logs = habitIds
        .map((habitId) => {
              'habit_id': habitId,
              'user_id': userId,
              'date': today,
              'status': 'completed',
            })
        .toList();

    await _supabase
        .from('habit_logs')
        .upsert(logs, onConflict: 'habit_id,date');
  }

  static String _todayStr() {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }
}
