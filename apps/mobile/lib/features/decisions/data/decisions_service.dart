import 'package:vitamind/core/constants/app_constants.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class DecisionOption {
  final String option;
  final List<String> pros;
  final List<String> cons;
  final int goalAlignment;
  final String riskLevel;
  final String effortRequired;

  const DecisionOption({
    required this.option,
    required this.pros,
    required this.cons,
    required this.goalAlignment,
    required this.riskLevel,
    required this.effortRequired,
  });

  factory DecisionOption.fromMap(Map<String, dynamic> m) => DecisionOption(
        option: m['option'] as String? ?? '',
        pros: List<String>.from(m['pros'] as List? ?? []),
        cons: List<String>.from(m['cons'] as List? ?? []),
        goalAlignment: (m['goal_alignment'] as num?)?.toInt() ?? 0,
        riskLevel: m['risk_level'] as String? ?? 'medium',
        effortRequired: m['effort_required'] as String? ?? 'medium',
      );
}

class DecisionAnalysis {
  final String recommendation;
  final List<DecisionOption> optionsAnalysis;
  final List<String> keyConsiderations;
  final String confidence;

  const DecisionAnalysis({
    required this.recommendation,
    required this.optionsAnalysis,
    required this.keyConsiderations,
    required this.confidence,
  });

  factory DecisionAnalysis.fromMap(Map<String, dynamic> m) => DecisionAnalysis(
        recommendation: m['recommendation'] as String? ?? '',
        optionsAnalysis: (m['options_analysis'] as List? ?? [])
            .map((e) => DecisionOption.fromMap(e as Map<String, dynamic>))
            .toList(),
        keyConsiderations: List<String>.from(m['key_considerations'] as List? ?? []),
        confidence: m['confidence'] as String? ?? 'medium',
      );
}

class Decision {
  final String id;
  final String question;
  final List<String> options;
  final DecisionAnalysis? analysis;
  final String createdAt;

  const Decision({
    required this.id,
    required this.question,
    required this.options,
    this.analysis,
    required this.createdAt,
  });

  factory Decision.fromMap(Map<String, dynamic> m) => Decision(
        id: m['id'] as String,
        question: m['question'] as String,
        options: List<String>.from(m['options'] as List? ?? []),
        analysis: m['analysis'] != null
            ? DecisionAnalysis.fromMap(m['analysis'] as Map<String, dynamic>)
            : null,
        createdAt: m['created_at'] as String? ?? '',
      );
}

class DecisionsService {
  final String _baseUrl;
  DecisionsService()
      : _baseUrl = AppConstants.apiBaseUrl;

  Future<Map<String, String>> _authHeaders() async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) throw Exception('Not authenticated');
    return {
      'Authorization': 'Bearer ${session.accessToken}',
      'Content-Type': 'application/json',
    };
  }

  Future<List<Decision>> getHistory() async {
    try {
      final dio = Dio();
      final res = await dio.get(
        '$_baseUrl/api/v1/decisions',
        options: Options(headers: await _authHeaders()),
      );
      return (res.data['data'] as List? ?? [])
          .map((e) => Decision.fromMap(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('DecisionsService.getHistory failed: $e');
      rethrow;
    }
  }

  Future<Decision> analyze({required String question, required List<String> options}) async {
    try {
      final dio = Dio();
      final res = await dio.post(
        '$_baseUrl/api/v1/decisions',
        data: {'question': question, 'options': options},
        options: Options(headers: await _authHeaders()),
      );
      return Decision.fromMap(res.data['data'] as Map<String, dynamic>);
    } catch (e) {
      debugPrint('DecisionsService.analyze failed: $e');
      rethrow;
    }
  }

  Future<void> delete(String id) async {
    try {
      final dio = Dio();
      await dio.delete(
        '$_baseUrl/api/v1/decisions/$id',
        options: Options(headers: await _authHeaders()),
      );
    } catch (e) {
      debugPrint('DecisionsService.delete failed: $e');
      rethrow;
    }
  }
}
