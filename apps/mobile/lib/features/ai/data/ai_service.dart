import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ChatMessage {
  final String role; // 'user' | 'assistant'
  final String content;
  final DateTime timestamp;

  ChatMessage({
    required this.role,
    required this.content,
    required this.timestamp,
  });
}

class DailyPlanResult {
  final String plan;
  final bool cached;

  DailyPlanResult({required this.plan, required this.cached});
}

class AiService {
  late final Dio _dio;

  AiService() {
    final base = dotenv.env['API_BASE_URL'] ?? '';
    _dio = Dio(BaseOptions(
      baseUrl: '$base/api/v1',
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 60),
    ));
  }

  String get _token =>
      Supabase.instance.client.auth.currentSession?.accessToken ?? '';

  Future<DailyPlanResult> fetchDailyPlan({bool force = false}) async {
    final resp = await _dio.post(
      '/ai/daily-plan',
      data: {'force': force},
      options: Options(headers: {'Authorization': 'Bearer $_token'}),
    );
    final data = resp.data['data'] as Map<String, dynamic>;
    return DailyPlanResult(
      plan: data['plan'] as String,
      cached: data['cached'] as bool? ?? false,
    );
  }

  Future<ChatMessage> sendMessage(List<ChatMessage> history, String text) async {
    final messages = [
      ...history.map((m) => {'role': m.role, 'content': m.content}),
      {'role': 'user', 'content': text},
    ];
    final resp = await _dio.post(
      '/ai/chat',
      data: {'messages': messages},
      options: Options(headers: {'Authorization': 'Bearer $_token'}),
    );
    final data = resp.data['data'] as Map<String, dynamic>;
    final msg = data['message'] as Map<String, dynamic>;
    return ChatMessage(
      role: msg['role'] as String,
      content: msg['content'] as String,
      timestamp: DateTime.tryParse(data['timestamp'] as String? ?? '') ??
          DateTime.now(),
    );
  }
}
