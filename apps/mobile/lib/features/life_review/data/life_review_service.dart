import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/cache_service.dart';

/// A monthly life review containing an AI-generated report and the raw
/// data snapshot used to produce it.
class LifeReview {
  final String id;
  final String userId;
  final String month; // YYYY-MM format
  final String report;
  final Map<String, dynamic> data;
  final DateTime createdAt;

  const LifeReview({
    required this.id,
    required this.userId,
    required this.month,
    required this.report,
    required this.data,
    required this.createdAt,
  });

  factory LifeReview.fromMap(Map<String, dynamic> m) {
    return LifeReview(
      id: m['id'] as String,
      userId: m['user_id'] as String,
      month: m['month'] as String,
      report: m['report'] as String,
      data: m['data'] as Map<String, dynamic>? ?? {},
      createdAt: DateTime.parse(m['created_at'] as String),
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'user_id': userId,
        'month': month,
        'report': report,
        'data': data,
        'created_at': createdAt.toIso8601String(),
      };
}

class LifeReviewService {
  final _supabase = Supabase.instance.client;

  static String _cacheKey(String userId) => 'life_reviews_$userId';

  /// Returns all life reviews ordered newest-month first.
  /// Cached for 24 hours since reviews are generated monthly and rarely change.
  Future<List<LifeReview>> fetchAll(String userId) async {
    final cacheKey = _cacheKey(userId);

    try {
      final data = await _supabase
          .from('life_reviews')
          .select()
          .eq('user_id', userId)
          .order('month', ascending: false);

      final reviews = (data as List)
          .map((m) => LifeReview.fromMap(m as Map<String, dynamic>))
          .toList();

      await CacheService.save(
        cacheKey,
        reviews.map((r) => r.toMap()).toList(),
      );

      return reviews;
    } catch (e) {
      debugPrint('LifeReviewService.fetchAll failed: $e');

      final cached = await CacheService.load<List<dynamic>>(
        cacheKey,
        maxAge: const Duration(hours: 24),
      );
      if (cached != null) {
        debugPrint('LifeReviewService: serving cached reviews');
        return cached
            .map((m) => LifeReview.fromMap(m as Map<String, dynamic>))
            .toList();
      }
      rethrow;
    }
  }

  /// Returns a single review for the given month (YYYY-MM), or null if
  /// no review has been generated for that month yet.
  Future<LifeReview?> fetchByMonth(String userId, String month) async {
    try {
      final data = await _supabase
          .from('life_reviews')
          .select()
          .eq('user_id', userId)
          .eq('month', month)
          .maybeSingle();

      if (data == null) return null;

      return LifeReview.fromMap(data);
    } catch (e) {
      debugPrint('LifeReviewService.fetchByMonth($month) failed: $e');
      rethrow;
    }
  }
}
