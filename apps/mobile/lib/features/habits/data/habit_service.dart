import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/cache_service.dart';

class Habit {
  final String id;
  final String title;
  final String frequency;
  final int currentStreak;
  final bool completedToday;
  final String? reminderTime; // HH:MM format

  const Habit({
    required this.id,
    required this.title,
    required this.frequency,
    required this.currentStreak,
    required this.completedToday,
    this.reminderTime,
  });

  factory Habit.fromMap(Map<String, dynamic> m, {bool completedToday = false}) => Habit(
        id: m['id'] as String,
        title: m['title'] as String,
        frequency: m['frequency'] as String? ?? 'daily',
        currentStreak: (m['current_streak'] as num?)?.toInt() ?? 0,
        completedToday: completedToday,
        reminderTime: (m['reminder_time'] as String?)?.substring(0, 5), // trim seconds
      );

  Map<String, dynamic> toMap() => {
        'id': id,
        'title': title,
        'frequency': frequency,
        'current_streak': currentStreak,
        'completed_today': completedToday,
        'reminder_time': reminderTime,
      };

  /// Reconstructs a Habit from a cached map (includes completedToday flag).
  factory Habit.fromCacheMap(Map<String, dynamic> m) => Habit(
        id: m['id'] as String,
        title: m['title'] as String,
        frequency: m['frequency'] as String? ?? 'daily',
        currentStreak: (m['current_streak'] as num?)?.toInt() ?? 0,
        completedToday: m['completed_today'] as bool? ?? false,
        reminderTime: m['reminder_time'] as String?,
      );

  Habit copyWith({bool? completedToday}) => Habit(
        id: id,
        title: title,
        frequency: frequency,
        currentStreak: currentStreak,
        completedToday: completedToday ?? this.completedToday,
        reminderTime: reminderTime,
      );
}

// Pagination metadata returned alongside a page of results
class PaginatedHabits {
  final List<Habit> habits;
  final int total;
  final int page;
  final int limit;
  final bool isFromCache;

  const PaginatedHabits({
    required this.habits,
    required this.total,
    required this.page,
    required this.limit,
    this.isFromCache = false,
  });

  int get totalPages => total == 0 ? 1 : (total / limit).ceil();
  bool get hasMore => page < totalPages;
}

class HabitService {
  final _supabase = Supabase.instance.client;

  static String _cacheKey(String userId) => 'habits_$userId';

  Future<PaginatedHabits> getAllWithTodayStatus(
    String userId, {
    int page = 1,
    int limit = 20,
  }) async {
    final shouldCache = page == 1;
    final cacheKey = _cacheKey(userId);

    try {
      final result =
          await _fetchFromNetwork(userId, page: page, limit: limit);

      if (shouldCache) {
        // Cache the enriched habits (with completedToday baked in).
        await CacheService.save(
          cacheKey,
          result.habits.map((h) => h.toMap()).toList(),
        );
      }

      return result;
    } catch (e) {
      if (shouldCache) {
        final cached = await CacheService.load<List<dynamic>>(cacheKey);
        if (cached != null) {
          debugPrint('HabitService: serving cached data for $cacheKey');
          final habits = cached
              .map((m) => Habit.fromCacheMap(m as Map<String, dynamic>))
              .toList();
          return PaginatedHabits(
            habits: habits,
            total: habits.length,
            page: 1,
            limit: limit,
            isFromCache: true,
          );
        }
      }
      rethrow;
    }
  }

  Future<PaginatedHabits> _fetchFromNetwork(
    String userId, {
    int page = 1,
    int limit = 20,
  }) async {
    final today = _todayStr();
    final from = (page - 1) * limit;
    final to = from + limit - 1;

    final results = await Future.wait([
      _supabase
          .from('habits')
          .select()
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at')
          .range(from, to),
      _supabase
          .from('habit_logs')
          .select('habit_id')
          .eq('user_id', userId)
          .eq('date', today)
          .eq('status', 'completed'),
    ]);

    final habits = (results[0] as List)
        .map((m) => Habit.fromMap(m as Map<String, dynamic>))
        .toList();
    final completedIds =
        (results[1] as List).map((m) => (m as Map<String, dynamic>)['habit_id'] as String).toSet();

    final enriched = habits
        .map((h) => h.copyWith(completedToday: completedIds.contains(h.id)))
        .toList();

    final countResponse = await _supabase
        .from('habits')
        .select()
        .eq('user_id', userId)
        .eq('is_active', true)
        .count(CountOption.exact);

    final total = countResponse.count;

    return PaginatedHabits(
      habits: enriched,
      total: total,
      page: page,
      limit: limit,
    );
  }

  Future<void> logToday(String habitId, String userId) async {
    final today = _todayStr();
    await _supabase.from('habit_logs').upsert({
      'habit_id': habitId,
      'user_id': userId,
      'date': today,
      'status': 'completed',
    }, onConflict: 'habit_id,date');
  }

  Future<Habit> create({
    required String userId,
    required String title,
    String frequency = 'daily',
    String? reminderTime,
  }) async {
    final data = await _supabase.from('habits').insert({
      'user_id': userId,
      'title': title,
      'frequency': frequency,
      'is_active': true,
      if (reminderTime != null) 'reminder_time': reminderTime,
    }).select().single();
    return Habit.fromMap(data as Map<String, dynamic>);
  }

  Future<void> delete(String habitId) async {
    await _supabase.from('habits').update({'is_active': false}).eq('id', habitId);
  }

  static String _todayStr() {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }
}
