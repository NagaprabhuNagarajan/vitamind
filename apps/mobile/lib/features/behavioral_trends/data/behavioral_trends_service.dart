import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/cache_service.dart';

/// A weekly summary of the user's momentum metrics.
class WeekSummary {
  final String weekStart;
  final String weekLabel;
  final int avgScore;
  final int avgTaskVelocity;
  final int avgHabitConsistency;
  final int avgGoalTrajectory;
  final int avgOverduePressure;
  final int avgBurnoutRisk;
  final int daysRecorded;

  const WeekSummary({
    required this.weekStart,
    required this.weekLabel,
    required this.avgScore,
    required this.avgTaskVelocity,
    required this.avgHabitConsistency,
    required this.avgGoalTrajectory,
    required this.avgOverduePressure,
    required this.avgBurnoutRisk,
    required this.daysRecorded,
  });

  factory WeekSummary.fromMap(Map<String, dynamic> m) => WeekSummary(
        weekStart: m['week_start'] as String,
        weekLabel: m['week_label'] as String,
        avgScore: (m['avg_score'] as num).toInt(),
        avgTaskVelocity: (m['avg_task_velocity'] as num).toInt(),
        avgHabitConsistency: (m['avg_habit_consistency'] as num).toInt(),
        avgGoalTrajectory: (m['avg_goal_trajectory'] as num).toInt(),
        avgOverduePressure: (m['avg_overdue_pressure'] as num).toInt(),
        avgBurnoutRisk: (m['avg_burnout_risk'] as num).toInt(),
        daysRecorded: (m['days_recorded'] as num).toInt(),
      );
}

/// Overall direction of a metric over time.
enum TrendDirection { improving, declining, stable }

TrendDirection parseTrendDirection(String? value) {
  switch (value) {
    case 'improving':
      return TrendDirection.improving;
    case 'declining':
      return TrendDirection.declining;
    default:
      return TrendDirection.stable;
  }
}

class ComponentTrend {
  final TrendDirection direction;
  final int delta;

  const ComponentTrend({required this.direction, required this.delta});

  factory ComponentTrend.fromMap(Map<String, dynamic> m) => ComponentTrend(
        direction: parseTrendDirection(m['direction'] as String?),
        delta: (m['delta'] as num).toInt(),
      );
}

class BehavioralTrendsResult {
  final List<WeekSummary> weeks;
  final TrendDirection overallTrend;
  final int overallDelta;
  final Map<String, ComponentTrend> componentTrends;
  final WeekSummary? bestWeek;
  final WeekSummary? worstWeek;
  final bool hasEnoughData;

  const BehavioralTrendsResult({
    required this.weeks,
    required this.overallTrend,
    required this.overallDelta,
    required this.componentTrends,
    this.bestWeek,
    this.worstWeek,
    required this.hasEnoughData,
  });

  factory BehavioralTrendsResult.fromMap(Map<String, dynamic> m) {
    final weeksList = (m['weeks'] as List? ?? [])
        .map((w) => WeekSummary.fromMap(w as Map<String, dynamic>))
        .toList();

    final ct = m['component_trends'] as Map<String, dynamic>? ?? {};
    final componentTrends = ct.map(
      (key, value) =>
          MapEntry(key, ComponentTrend.fromMap(value as Map<String, dynamic>)),
    );

    return BehavioralTrendsResult(
      weeks: weeksList,
      overallTrend: parseTrendDirection(m['overall_trend'] as String?),
      overallDelta: (m['overall_delta'] as num? ?? 0).toInt(),
      componentTrends: componentTrends,
      bestWeek: m['best_week'] != null
          ? WeekSummary.fromMap(m['best_week'] as Map<String, dynamic>)
          : null,
      worstWeek: m['worst_week'] != null
          ? WeekSummary.fromMap(m['worst_week'] as Map<String, dynamic>)
          : null,
      hasEnoughData: m['has_enough_data'] as bool? ?? false,
    );
  }
}

class BehavioralTrendsService {
  static const _cacheKey = 'behavioral_trends';
  static const _cacheDuration = Duration(hours: 4);

  /// Fetches behavioral trend analysis from the backend.
  /// Cached for 4 hours as the computation is expensive.
  Future<BehavioralTrendsResult> fetchTrends() async {
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) throw Exception('Not authenticated');

      final baseUrl = const String.fromEnvironment(
        'API_BASE_URL',
        defaultValue: 'https://vitamind-woad.vercel.app',
      );

      final dio = Dio();
      final response = await dio.get(
        '$baseUrl/api/v1/behavioral-trends',
        options: Options(
          headers: {'Authorization': 'Bearer ${session.accessToken}'},
        ),
      );

      final result = BehavioralTrendsResult.fromMap(
        response.data['data'] as Map<String, dynamic>,
      );

      // Cache the raw JSON
      await CacheService.save(_cacheKey, response.data['data']);
      return result;
    } catch (e) {
      debugPrint('BehavioralTrendsService.fetchTrends failed: $e');

      final cached = await CacheService.load<Map<String, dynamic>>(
        _cacheKey,
        maxAge: _cacheDuration,
      );
      if (cached != null) {
        debugPrint('BehavioralTrendsService: serving cached trends');
        return BehavioralTrendsResult.fromMap(cached);
      }
      rethrow;
    }
  }
}
