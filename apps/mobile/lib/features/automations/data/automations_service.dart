import 'package:vitamind/core/constants/app_constants.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AutomationRule {
  final String id;
  final String name;
  final String triggerType;
  final String actionType;
  final Map<String, dynamic> triggerConfig;
  final Map<String, dynamic> actionConfig;
  final bool isActive;
  final String? lastTriggeredAt;

  const AutomationRule({
    required this.id,
    required this.name,
    required this.triggerType,
    required this.actionType,
    required this.triggerConfig,
    required this.actionConfig,
    required this.isActive,
    this.lastTriggeredAt,
  });

  factory AutomationRule.fromMap(Map<String, dynamic> m) => AutomationRule(
        id: m['id'] as String,
        name: m['name'] as String,
        triggerType: m['trigger_type'] as String,
        actionType: m['action_type'] as String,
        triggerConfig: (m['trigger_config'] as Map<String, dynamic>?) ?? {},
        actionConfig: (m['action_config'] as Map<String, dynamic>?) ?? {},
        isActive: m['is_active'] as bool? ?? true,
        lastTriggeredAt: m['last_triggered_at'] as String?,
      );
}

class AutomationsService {
  final String _baseUrl;
  AutomationsService()
      : _baseUrl = AppConstants.apiBaseUrl;

  Future<Map<String, String>> _authHeaders() async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) throw Exception('Not authenticated');
    return {
      'Authorization': 'Bearer ${session.accessToken}',
      'Content-Type': 'application/json',
    };
  }

  Future<({List<AutomationRule> rules, Map<String, String> triggerLabels, Map<String, String> actionLabels})> getRules() async {
    try {
      final dio = Dio();
      final res = await dio.get(
        '$_baseUrl/api/v1/automations',
        options: Options(headers: await _authHeaders()),
      );
      final data = res.data['data'] as Map<String, dynamic>;
      return (
        rules: (data['rules'] as List)
            .map((r) => AutomationRule.fromMap(r as Map<String, dynamic>))
            .toList(),
        triggerLabels: Map<String, String>.from(data['trigger_labels'] as Map? ?? {}),
        actionLabels: Map<String, String>.from(data['action_labels'] as Map? ?? {}),
      );
    } catch (e) {
      debugPrint('AutomationsService.getRules failed: $e');
      rethrow;
    }
  }

  Future<void> createRule({
    required String name,
    required String triggerType,
    required String actionType,
    Map<String, dynamic> triggerConfig = const {},
    Map<String, dynamic> actionConfig = const {},
  }) async {
    try {
      final dio = Dio();
      await dio.post(
        '$_baseUrl/api/v1/automations',
        data: {
          'name': name,
          'trigger_type': triggerType,
          'action_type': actionType,
          'trigger_config': triggerConfig,
          'action_config': actionConfig,
        },
        options: Options(headers: await _authHeaders()),
      );
    } catch (e) {
      debugPrint('AutomationsService.createRule failed: $e');
      rethrow;
    }
  }

  Future<void> toggleRule(String id, bool isActive) async {
    try {
      final dio = Dio();
      await dio.put(
        '$_baseUrl/api/v1/automations/$id',
        data: {'is_active': isActive},
        options: Options(headers: await _authHeaders()),
      );
    } catch (e) {
      debugPrint('AutomationsService.toggleRule failed: $e');
      rethrow;
    }
  }

  Future<void> deleteRule(String id) async {
    try {
      final dio = Dio();
      await dio.delete(
        '$_baseUrl/api/v1/automations/$id',
        options: Options(headers: await _authHeaders()),
      );
    } catch (e) {
      debugPrint('AutomationsService.deleteRule failed: $e');
      rethrow;
    }
  }
}
