import 'package:vitamind/core/constants/app_constants.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class CompanionMessage {
  final String role;
  final String content;
  final DateTime timestamp;

  const CompanionMessage({
    required this.role,
    required this.content,
    required this.timestamp,
  });
}

class CompanionService {
  final String _baseUrl;
  CompanionService()
      : _baseUrl = AppConstants.apiBaseUrl;

  Future<Map<String, String>> _authHeaders() async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) throw Exception('Not authenticated');
    return {
      'Authorization': 'Bearer ${session.accessToken}',
      'Content-Type': 'application/json',
    };
  }

  Future<CompanionMessage> sendMessage(
    List<CompanionMessage> history,
    String userText,
  ) async {
    try {
      final dio = Dio();
      final messages = [
        ...history.map((m) => {'role': m.role, 'content': m.content}),
        {'role': 'user', 'content': userText},
      ];
      final res = await dio.post(
        '$_baseUrl/api/v1/ai/companion',
        data: {'messages': messages},
        options: Options(headers: await _authHeaders()),
      );
      final data = res.data['data'] as Map<String, dynamic>;
      final msg = data['message'] as Map<String, dynamic>;
      return CompanionMessage(
        role: msg['role'] as String,
        content: msg['content'] as String,
        timestamp: DateTime.now(),
      );
    } catch (e) {
      debugPrint('CompanionService.sendMessage failed: $e');
      rethrow;
    }
  }
}
