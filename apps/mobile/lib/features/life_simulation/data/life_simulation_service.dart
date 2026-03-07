import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SimulationMilestone {
  final int month;
  final String title;
  final String description;
  final int probability;
  final String? metric;

  const SimulationMilestone({
    required this.month,
    required this.title,
    required this.description,
    required this.probability,
    this.metric,
  });

  factory SimulationMilestone.fromMap(Map<String, dynamic> m) => SimulationMilestone(
        month: (m['month'] as num?)?.toInt() ?? 1,
        title: m['title'] as String? ?? '',
        description: m['description'] as String? ?? '',
        probability: (m['probability'] as num?)?.toInt() ?? 50,
        metric: m['metric'] as String?,
      );
}

class SimulationResult {
  final String scenario;
  final String summary;
  final String outcomeAt12Months;
  final int probabilityOfSuccess;
  final List<SimulationMilestone> milestones;
  final List<String> keyRisks;
  final List<String> keyEnablers;
  final String recommendation;

  const SimulationResult({
    required this.scenario,
    required this.summary,
    required this.outcomeAt12Months,
    required this.probabilityOfSuccess,
    required this.milestones,
    required this.keyRisks,
    required this.keyEnablers,
    required this.recommendation,
  });

  factory SimulationResult.fromMap(Map<String, dynamic> m) => SimulationResult(
        scenario: m['scenario'] as String? ?? '',
        summary: m['summary'] as String? ?? '',
        outcomeAt12Months: m['outcome_at_12_months'] as String? ?? '',
        probabilityOfSuccess: (m['probability_of_success'] as num?)?.toInt() ?? 50,
        milestones: (m['milestones'] as List? ?? [])
            .map((e) => SimulationMilestone.fromMap(e as Map<String, dynamic>))
            .toList(),
        keyRisks: List<String>.from(m['key_risks'] as List? ?? []),
        keyEnablers: List<String>.from(m['key_enablers'] as List? ?? []),
        recommendation: m['recommendation'] as String? ?? '',
      );
}

class LifeSimulationService {
  final String _baseUrl;
  LifeSimulationService()
      : _baseUrl = const String.fromEnvironment(
          'API_BASE_URL',
          defaultValue: 'https://vitamind-woad.vercel.app',
        );

  Future<Map<String, String>> _authHeaders() async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) throw Exception('Not authenticated');
    return {
      'Authorization': 'Bearer ${session.accessToken}',
      'Content-Type': 'application/json',
    };
  }

  Future<SimulationResult> simulate(String scenario) async {
    try {
      final dio = Dio();
      final res = await dio.post(
        '$_baseUrl/api/v1/life-simulation',
        data: {'scenario': scenario},
        options: Options(headers: await _authHeaders()),
      );
      return SimulationResult.fromMap(res.data['data'] as Map<String, dynamic>);
    } catch (e) {
      debugPrint('LifeSimulationService.simulate failed: $e');
      rethrow;
    }
  }
}
