import 'package:vitamind/core/constants/app_constants.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class HealthEntry {
  final String id;
  final String date;
  final double? sleepHours;
  final int? steps;
  final int? waterMl;
  final double? weightKg;
  final int? exerciseMinutes;
  final int? mood;
  final String? notes;

  const HealthEntry({
    required this.id,
    required this.date,
    this.sleepHours,
    this.steps,
    this.waterMl,
    this.weightKg,
    this.exerciseMinutes,
    this.mood,
    this.notes,
  });

  factory HealthEntry.fromMap(Map<String, dynamic> m) => HealthEntry(
        id: m['id'] as String,
        date: m['date'] as String,
        sleepHours: (m['sleep_hours'] as num?)?.toDouble(),
        steps: m['steps'] as int?,
        waterMl: m['water_ml'] as int?,
        weightKg: (m['weight_kg'] as num?)?.toDouble(),
        exerciseMinutes: m['exercise_minutes'] as int?,
        mood: m['mood'] as int?,
        notes: m['notes'] as String?,
      );
}

class HealthInsights {
  final double? avgSleep;
  final double? avgSteps;
  final double? avgMood;
  final double? avgExercise;
  final String sleepTrend;
  final String moodTrend;
  final int streakDays;

  const HealthInsights({
    this.avgSleep,
    this.avgSteps,
    this.avgMood,
    this.avgExercise,
    required this.sleepTrend,
    required this.moodTrend,
    required this.streakDays,
  });

  factory HealthInsights.fromMap(Map<String, dynamic> m) => HealthInsights(
        avgSleep: (m['avg_sleep'] as num?)?.toDouble(),
        avgSteps: (m['avg_steps'] as num?)?.toDouble(),
        avgMood: (m['avg_mood'] as num?)?.toDouble(),
        avgExercise: (m['avg_exercise'] as num?)?.toDouble(),
        sleepTrend: m['sleep_trend'] as String? ?? 'stable',
        moodTrend: m['mood_trend'] as String? ?? 'stable',
        streakDays: m['streak_days'] as int? ?? 0,
      );
}

class HealthService {
  final String _baseUrl;
  HealthService()
      : _baseUrl = AppConstants.apiBaseUrl;

  Future<Map<String, String>> _authHeaders() async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) throw Exception('Not authenticated');
    return {
      'Authorization': 'Bearer ${session.accessToken}',
      'Content-Type': 'application/json',
    };
  }

  Future<({List<HealthEntry> entries, HealthInsights insights})> getHealthData({int days = 30}) async {
    try {
      final dio = Dio();
      final res = await dio.get(
        '$_baseUrl/api/v1/health',
        queryParameters: {'days': days},
        options: Options(headers: await _authHeaders()),
      );
      final data = res.data['data'] as Map<String, dynamic>;
      return (
        entries: (data['entries'] as List)
            .map((e) => HealthEntry.fromMap(e as Map<String, dynamic>))
            .toList(),
        insights: HealthInsights.fromMap(data['insights'] as Map<String, dynamic>),
      );
    } catch (e) {
      debugPrint('HealthService.getHealthData failed: $e');
      rethrow;
    }
  }

  Future<void> logEntry(Map<String, dynamic> body) async {
    try {
      final dio = Dio();
      await dio.post(
        '$_baseUrl/api/v1/health',
        data: body,
        options: Options(headers: await _authHeaders()),
      );
    } catch (e) {
      debugPrint('HealthService.logEntry failed: $e');
      rethrow;
    }
  }
}
