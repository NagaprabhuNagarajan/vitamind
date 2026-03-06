import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/cache_service.dart';

/// Represents a point-in-time productivity momentum score composed of
/// weighted sub-signals (task velocity, habit consistency, etc.).
class MomentumSnapshot {
  final String id;
  final String userId;
  final String date;
  final int score;
  final Map<String, double> components;
  final DateTime createdAt;

  const MomentumSnapshot({
    required this.id,
    required this.userId,
    required this.date,
    required this.score,
    required this.components,
    required this.createdAt,
  });

  factory MomentumSnapshot.fromMap(Map<String, dynamic> m) {
    // Components are stored as individual SMALLINT columns (0-100),
    // normalise to 0.0-1.0 for display.
    final components = <String, double>{
      'task_velocity': ((m['task_velocity'] as num?)?.toDouble() ?? 0.0) / 100,
      'habit_consistency':
          ((m['habit_consistency'] as num?)?.toDouble() ?? 0.0) / 100,
      'goal_trajectory':
          ((m['goal_trajectory'] as num?)?.toDouble() ?? 0.0) / 100,
      'overdue_pressure':
          ((m['overdue_pressure'] as num?)?.toDouble() ?? 0.0) / 100,
    };

    return MomentumSnapshot(
      id: m['id'] as String,
      userId: m['user_id'] as String,
      date: m['date'] as String,
      score: (m['score'] as num).toInt(),
      components: components,
      createdAt: DateTime.parse(m['created_at'] as String),
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'user_id': userId,
        'date': date,
        'score': score,
        'components': components,
        'created_at': createdAt.toIso8601String(),
      };
}

class MomentumService {
  final _supabase = Supabase.instance.client;

  static String _cacheKey(String userId) => 'momentum_current_$userId';

  /// Returns the most recent momentum snapshot for the user.
  /// Cached for 1 hour to avoid redundant reads on repeated screen visits.
  Future<MomentumSnapshot?> fetchCurrent(String userId) async {
    final cacheKey = _cacheKey(userId);

    try {
      final data = await _supabase
          .from('momentum_snapshots')
          .select()
          .eq('user_id', userId)
          .order('date', ascending: false)
          .limit(1)
          .maybeSingle();

      if (data == null) return null;

      final snapshot = MomentumSnapshot.fromMap(data);

      await CacheService.save(cacheKey, snapshot.toMap());

      return snapshot;
    } catch (e) {
      debugPrint('MomentumService.fetchCurrent failed: $e');

      final cached = await CacheService.load<Map<String, dynamic>>(
        cacheKey,
        maxAge: const Duration(hours: 1),
      );
      if (cached != null) {
        debugPrint('MomentumService: serving cached current snapshot');
        return MomentumSnapshot.fromMap(cached);
      }
      rethrow;
    }
  }

  /// Returns momentum history for the last [days] days, ordered newest first.
  Future<List<MomentumSnapshot>> fetchHistory(
    String userId, {
    int days = 30,
  }) async {
    final cutoff = DateTime.now().subtract(Duration(days: days));
    final cutoffStr =
        '${cutoff.year}-${cutoff.month.toString().padLeft(2, '0')}-${cutoff.day.toString().padLeft(2, '0')}';

    try {
      final data = await _supabase
          .from('momentum_snapshots')
          .select()
          .eq('user_id', userId)
          .gte('date', cutoffStr)
          .order('date', ascending: false);

      return (data as List)
          .map((m) => MomentumSnapshot.fromMap(m as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('MomentumService.fetchHistory failed: $e');
      rethrow;
    }
  }
}
