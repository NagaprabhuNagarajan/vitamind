import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/cache_service.dart';

/// An AI-discovered behavioral pattern such as "You complete more tasks
/// before noon" or "Exercise is your keystone habit."
class PatternInsight {
  final String id;
  final String userId;
  final String type;
  final String title;
  final String description;
  final double confidence;
  final bool dismissed;
  final DateTime computedAt;

  const PatternInsight({
    required this.id,
    required this.userId,
    required this.type,
    required this.title,
    required this.description,
    required this.confidence,
    required this.dismissed,
    required this.computedAt,
  });

  factory PatternInsight.fromMap(Map<String, dynamic> m) {
    return PatternInsight(
      id: m['id'] as String,
      userId: m['user_id'] as String,
      type: m['type'] as String,
      title: m['title'] as String,
      description: m['description'] as String,
      confidence: (m['confidence'] as num).toDouble(),
      dismissed: m['dismissed'] as bool? ?? false,
      computedAt: DateTime.parse(m['computed_at'] as String),
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'user_id': userId,
        'type': type,
        'title': title,
        'description': description,
        'confidence': confidence,
        'dismissed': dismissed,
        'computed_at': computedAt.toIso8601String(),
      };
}

class PatternsService {
  final _supabase = Supabase.instance.client;

  static String _cacheKey(String userId) => 'pattern_insights_$userId';

  /// Returns all non-dismissed insights ranked by confidence (highest first).
  /// Cached for 6 hours because pattern computation is expensive and results
  /// change infrequently.
  Future<List<PatternInsight>> fetchInsights(String userId) async {
    final cacheKey = _cacheKey(userId);

    try {
      final data = await _supabase
          .from('pattern_insights')
          .select()
          .eq('user_id', userId)
          .eq('dismissed', false)
          .order('confidence', ascending: false);

      final insights = (data as List)
          .map((m) => PatternInsight.fromMap(m as Map<String, dynamic>))
          .toList();

      await CacheService.save(
        cacheKey,
        insights.map((i) => i.toMap()).toList(),
      );

      return insights;
    } catch (e) {
      debugPrint('PatternsService.fetchInsights failed: $e');

      final cached = await CacheService.load<List<dynamic>>(
        cacheKey,
        maxAge: const Duration(hours: 6),
      );
      if (cached != null) {
        debugPrint('PatternsService: serving cached insights');
        return cached
            .map((m) => PatternInsight.fromMap(m as Map<String, dynamic>))
            .toList();
      }
      rethrow;
    }
  }

  /// Marks an insight as dismissed so it no longer appears in the feed.
  Future<void> dismiss(String insightId) async {
    await _supabase
        .from('pattern_insights')
        .update({'dismissed': true})
        .eq('id', insightId);
  }

  /// Returns the highest-confidence keystone habit insight, or null if none
  /// has been detected yet. Keystone habits are the single habits whose
  /// completion most strongly correlates with overall productivity.
  Future<PatternInsight?> getKeystoneHabit(String userId) async {
    try {
      final data = await _supabase
          .from('pattern_insights')
          .select()
          .eq('user_id', userId)
          .eq('type', 'keystone_habit')
          .eq('dismissed', false)
          .order('confidence', ascending: false)
          .limit(1)
          .maybeSingle();

      if (data == null) return null;

      return PatternInsight.fromMap(data);
    } catch (e) {
      debugPrint('PatternsService.getKeystoneHabit failed: $e');
      rethrow;
    }
  }
}
