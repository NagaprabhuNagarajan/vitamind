import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/cache_service.dart';

class ProductivityProfile {
  final List<int> peakHours;
  final Map<String, int> bestWindow; // {start: int, end: int}
  final List<String> bestDays;
  final List<String> worstDays;
  final double morningHabitRate;
  final double eveningHabitRate;

  const ProductivityProfile({
    required this.peakHours,
    required this.bestWindow,
    required this.bestDays,
    required this.worstDays,
    required this.morningHabitRate,
    required this.eveningHabitRate,
  });

  factory ProductivityProfile.fromMap(Map<String, dynamic> m) {
    return ProductivityProfile(
      peakHours: (m['peak_hours'] as List<dynamic>? ?? [])
          .map((e) => (e as num).toInt())
          .toList(),
      bestWindow: _parseBestWindow(m['best_window']),
      bestDays: (m['best_days'] as List<dynamic>? ?? [])
          .map((e) => e as String)
          .toList(),
      worstDays: (m['worst_days'] as List<dynamic>? ?? [])
          .map((e) => e as String)
          .toList(),
      morningHabitRate: (m['morning_habit_rate'] as num?)?.toDouble() ?? 0.0,
      eveningHabitRate: (m['evening_habit_rate'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toMap() => {
        'peak_hours': peakHours,
        'best_window': bestWindow,
        'best_days': bestDays,
        'worst_days': worstDays,
        'morning_habit_rate': morningHabitRate,
        'evening_habit_rate': eveningHabitRate,
      };

  ProductivityProfile copyWith({
    List<int>? peakHours,
    Map<String, int>? bestWindow,
    List<String>? bestDays,
    List<String>? worstDays,
    double? morningHabitRate,
    double? eveningHabitRate,
  }) =>
      ProductivityProfile(
        peakHours: peakHours ?? this.peakHours,
        bestWindow: bestWindow ?? this.bestWindow,
        bestDays: bestDays ?? this.bestDays,
        worstDays: worstDays ?? this.worstDays,
        morningHabitRate: morningHabitRate ?? this.morningHabitRate,
        eveningHabitRate: eveningHabitRate ?? this.eveningHabitRate,
      );

  static Map<String, int> _parseBestWindow(dynamic raw) {
    if (raw is Map) {
      return {
        'start': (raw['start'] as num?)?.toInt() ?? 0,
        'end': (raw['end'] as num?)?.toInt() ?? 0,
      };
    }
    return {'start': 0, 'end': 0};
  }
}

class TimeFingerprintService {
  final _supabase = Supabase.instance.client;

  static String _cacheKey(String userId) => 'time_fingerprint_$userId';

  /// Fetches the user's productivity profile from the JSONB column on users.
  /// Returns null when the column is empty or the user has no profile yet.
  Future<ProductivityProfile?> fetchProfile(String userId) async {
    final cacheKey = _cacheKey(userId);

    try {
      final data = await _supabase
          .from('users')
          .select('productivity_profile')
          .eq('id', userId)
          .single();

      final raw = data['productivity_profile'];
      if (raw == null || (raw is Map && raw.isEmpty)) return null;

      final profile =
          ProductivityProfile.fromMap(raw as Map<String, dynamic>);

      // Cache with 24-hour TTL for offline access
      await CacheService.save(cacheKey, profile.toMap());

      return profile;
    } catch (e) {
      debugPrint('TimeFingerprintService.fetchProfile failed: $e');

      // Attempt to serve from cache on network failure
      final cached =
          await CacheService.load<Map<String, dynamic>>(cacheKey);
      if (cached != null) {
        debugPrint('TimeFingerprintService: serving cached profile');
        return ProductivityProfile.fromMap(cached);
      }
      rethrow;
    }
  }
}
