import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class DomainVelocityItem {
  final String domain;
  final int score;
  final int delta;
  final String trend;

  const DomainVelocityItem({
    required this.domain,
    required this.score,
    required this.delta,
    required this.trend,
  });

  factory DomainVelocityItem.fromMap(Map<String, dynamic> m) => DomainVelocityItem(
        domain: m['domain'] as String? ?? '',
        score: (m['score'] as num?)?.toInt() ?? 0,
        delta: (m['delta'] as num?)?.toInt() ?? 0,
        trend: m['trend'] as String? ?? 'stable',
      );
}

class HiaItem {
  final String action;
  final String domain;
  final String projectedImpact;

  const HiaItem({required this.action, required this.domain, required this.projectedImpact});

  factory HiaItem.fromMap(Map<String, dynamic> m) => HiaItem(
        action: m['action'] as String? ?? '',
        domain: m['domain'] as String? ?? '',
        projectedImpact: m['projectedImpact'] as String? ?? '',
      );
}

class LifeReport {
  final String greeting;
  final int momentumScore;
  final List<int> momentumTrend;
  final String burnoutRisk; // 'low' | 'medium' | 'high'
  final String topInsight;
  final HiaItem highestImpactAction;
  final List<DomainVelocityItem> domains;
  final String? healthSummary;
  final String generatedAt;

  const LifeReport({
    required this.greeting,
    required this.momentumScore,
    required this.momentumTrend,
    required this.burnoutRisk,
    required this.topInsight,
    required this.highestImpactAction,
    required this.domains,
    this.healthSummary,
    required this.generatedAt,
  });

  factory LifeReport.fromMap(Map<String, dynamic> m) => LifeReport(
        greeting: m['greeting'] as String? ?? '',
        momentumScore: (m['momentumScore'] as num?)?.toInt() ?? 0,
        momentumTrend: (m['momentumTrend'] as List? ?? [])
            .map((e) => (e as num).toInt())
            .toList(),
        burnoutRisk: m['burnoutRisk'] as String? ?? 'low',
        topInsight: m['topInsight'] as String? ?? '',
        highestImpactAction: HiaItem.fromMap(
          m['highestImpactAction'] as Map<String, dynamic>? ?? {},
        ),
        domains: (m['domains'] as List? ?? [])
            .map((e) => DomainVelocityItem.fromMap(e as Map<String, dynamic>))
            .toList(),
        healthSummary: m['healthSummary'] as String?,
        generatedAt: m['generatedAt'] as String? ?? '',
      );
}

class LifeReportService {
  final String _baseUrl;
  LifeReportService()
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

  Future<LifeReport> getReport({bool force = false}) async {
    try {
      final dio = Dio();
      final url = '$_baseUrl/api/v1/ai/life-report${force ? '?force=true' : ''}';
      final res = await dio.get(
        url,
        options: Options(headers: await _authHeaders()),
      );
      return LifeReport.fromMap(res.data['data'] as Map<String, dynamic>);
    } catch (e) {
      debugPrint('LifeReportService.getReport failed: $e');
      rethrow;
    }
  }
}
