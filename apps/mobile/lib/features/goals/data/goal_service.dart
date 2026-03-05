import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/cache_service.dart';

class Goal {
  final String id;
  final String title;
  final String? description;
  final int progress;
  final bool isCompleted;
  final String? targetDate;
  final DateTime createdAt;

  const Goal({
    required this.id,
    required this.title,
    this.description,
    required this.progress,
    required this.isCompleted,
    this.targetDate,
    required this.createdAt,
  });

  factory Goal.fromMap(Map<String, dynamic> m) => Goal(
        id: m['id'] as String,
        title: m['title'] as String,
        description: m['description'] as String?,
        progress: (m['progress'] as num?)?.toInt() ?? 0,
        isCompleted: m['is_completed'] as bool? ?? false,
        targetDate: m['target_date'] as String?,
        createdAt: DateTime.parse(m['created_at'] as String),
      );

  Map<String, dynamic> toMap() => {
        'id': id,
        'title': title,
        'description': description,
        'progress': progress,
        'is_completed': isCompleted,
        'target_date': targetDate,
        'created_at': createdAt.toIso8601String(),
      };

  Goal copyWith({int? progress, bool? isCompleted}) => Goal(
        id: id,
        title: title,
        description: description,
        progress: progress ?? this.progress,
        isCompleted: isCompleted ?? this.isCompleted,
        targetDate: targetDate,
        createdAt: createdAt,
      );
}

// Pagination metadata returned alongside a page of results
class PaginatedGoals {
  final List<Goal> goals;
  final int total;
  final int page;
  final int limit;
  final bool isFromCache;

  const PaginatedGoals({
    required this.goals,
    required this.total,
    required this.page,
    required this.limit,
    this.isFromCache = false,
  });

  int get totalPages => total == 0 ? 1 : (total / limit).ceil();
  bool get hasMore => page < totalPages;
}

class GoalService {
  final _supabase = Supabase.instance.client;

  static String _cacheKey(String userId) => 'goals_$userId';

  Future<PaginatedGoals> getAll(
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
        await CacheService.save(
          cacheKey,
          result.goals.map((g) => g.toMap()).toList(),
        );
      }

      return result;
    } catch (e) {
      if (shouldCache) {
        final cached = await CacheService.load<List<dynamic>>(cacheKey);
        if (cached != null) {
          debugPrint('GoalService: serving cached data for $cacheKey');
          final goals = cached
              .map((m) => Goal.fromMap(m as Map<String, dynamic>))
              .toList();
          return PaginatedGoals(
            goals: goals,
            total: goals.length,
            page: 1,
            limit: limit,
            isFromCache: true,
          );
        }
      }
      rethrow;
    }
  }

  Future<PaginatedGoals> _fetchFromNetwork(
    String userId, {
    int page = 1,
    int limit = 20,
  }) async {
    final from = (page - 1) * limit;
    final to = from + limit - 1;

    final data = await _supabase
        .from('goals')
        .select()
        .eq('user_id', userId)
        .order('created_at', ascending: false)
        .range(from, to);

    final goals = (data as List)
        .map((m) => Goal.fromMap(m as Map<String, dynamic>))
        .toList();

    final countResponse = await _supabase
        .from('goals')
        .select()
        .eq('user_id', userId)
        .count(CountOption.exact);

    final total = countResponse.count;

    return PaginatedGoals(
      goals: goals,
      total: total,
      page: page,
      limit: limit,
    );
  }

  Future<Goal> create({
    required String userId,
    required String title,
    String? description,
    String? targetDate,
  }) async {
    final data = await _supabase.from('goals').insert({
      'user_id': userId,
      'title': title,
      'description': description,
      'target_date': targetDate,
      'progress': 0,
      'is_completed': false,
    }).select().single();
    return Goal.fromMap(data as Map<String, dynamic>);
  }

  Future<Goal> updateProgress(String goalId, int progress) async {
    final data = await _supabase
        .from('goals')
        .update({
          'progress': progress,
          'is_completed': progress >= 100,
        })
        .eq('id', goalId)
        .select()
        .single();
    return Goal.fromMap(data as Map<String, dynamic>);
  }

  Future<void> delete(String goalId) async {
    await _supabase.from('goals').delete().eq('id', goalId);
  }
}
