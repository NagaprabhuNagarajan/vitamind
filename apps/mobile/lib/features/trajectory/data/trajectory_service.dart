import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class DomainVelocity {
  final String domain;
  final int score;
  final int delta;
  final String trend; // 'up' | 'down' | 'stable'

  const DomainVelocity({
    required this.domain,
    required this.score,
    required this.delta,
    required this.trend,
  });

  factory DomainVelocity.fromMap(Map<String, dynamic> m) => DomainVelocity(
        domain: m['domain'] as String? ?? '',
        score: (m['score'] as num?)?.toInt() ?? 0,
        delta: (m['delta'] as num?)?.toInt() ?? 0,
        trend: m['trend'] as String? ?? 'stable',
      );
}

class HighestImpactAction {
  final String action;
  final String domain;
  final String projectedImpact;

  const HighestImpactAction({
    required this.action,
    required this.domain,
    required this.projectedImpact,
  });

  factory HighestImpactAction.fromMap(Map<String, dynamic> m) => HighestImpactAction(
        action: m['action'] as String? ?? '',
        domain: m['domain'] as String? ?? '',
        projectedImpact: m['projectedImpact'] as String? ?? '',
      );
}

class TrajectoryReport {
  final List<DomainVelocity> domains;
  final String overallTrend;
  final HighestImpactAction highestImpactAction;
  final String generatedAt;

  const TrajectoryReport({
    required this.domains,
    required this.overallTrend,
    required this.highestImpactAction,
    required this.generatedAt,
  });

  factory TrajectoryReport.fromMap(Map<String, dynamic> m) => TrajectoryReport(
        domains: (m['domains'] as List? ?? [])
            .map((e) => DomainVelocity.fromMap(e as Map<String, dynamic>))
            .toList(),
        overallTrend: m['overallTrend'] as String? ?? 'stable',
        highestImpactAction: HighestImpactAction.fromMap(
          m['highestImpactAction'] as Map<String, dynamic>? ?? {},
        ),
        generatedAt: m['generatedAt'] as String? ?? '',
      );
}

class TrajectoryService {
  final String _baseUrl;
  TrajectoryService()
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

  Future<TrajectoryReport> getReport({bool force = false}) async {
    try {
      final dio = Dio();
      final url = '$_baseUrl/api/v1/trajectory${force ? '?force=true' : ''}';
      final res = await dio.get(
        url,
        options: Options(headers: await _authHeaders()),
      );
      return TrajectoryReport.fromMap(res.data['data'] as Map<String, dynamic>);
    } catch (e) {
      debugPrint('TrajectoryService.getReport failed: $e');
      rethrow;
    }
  }
}
