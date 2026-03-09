import 'package:vitamind/core/constants/app_constants.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class CoachingInsight {
  final String title;
  final String observation;
  final String action;
  final String impact;
  final String domain;
  final String urgency;

  const CoachingInsight({
    required this.title,
    required this.observation,
    required this.action,
    required this.impact,
    required this.domain,
    required this.urgency,
  });

  factory CoachingInsight.fromMap(Map<String, dynamic> m) => CoachingInsight(
        title: m['title'] as String? ?? '',
        observation: m['observation'] as String? ?? '',
        action: m['action'] as String? ?? '',
        impact: m['impact'] as String? ?? '',
        domain: m['domain'] as String? ?? 'productivity',
        urgency: m['urgency'] as String? ?? 'medium',
      );
}

class CoachReport {
  final List<CoachingInsight> insights;
  final String summary;
  final String? focusThisWeek;
  final String generatedAt;

  const CoachReport({
    required this.insights,
    required this.summary,
    this.focusThisWeek,
    required this.generatedAt,
  });

  factory CoachReport.fromMap(Map<String, dynamic> m) => CoachReport(
        insights: (m['insights'] as List? ?? [])
            .map((e) => CoachingInsight.fromMap(e as Map<String, dynamic>))
            .toList(),
        summary: m['summary'] as String? ?? '',
        focusThisWeek: m['focus_this_week'] as String?,
        generatedAt: m['generated_at'] as String? ?? '',
      );
}

class LifeCoachService {
  final String _baseUrl;
  LifeCoachService()
      : _baseUrl = AppConstants.apiBaseUrl;

  Future<Map<String, String>> _authHeaders() async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) throw Exception('Not authenticated');
    return {
      'Authorization': 'Bearer ${session.accessToken}',
      'Content-Type': 'application/json',
    };
  }

  Future<CoachReport> getReport({bool force = false}) async {
    try {
      final dio = Dio();
      final res = await dio.get(
        '$_baseUrl/api/v1/ai/life-coach${force ? '?force=true' : ''}',
        options: Options(headers: await _authHeaders()),
      );
      return CoachReport.fromMap(res.data['data'] as Map<String, dynamic>);
    } catch (e) {
      debugPrint('LifeCoachService.getReport failed: $e');
      rethrow;
    }
  }
}
