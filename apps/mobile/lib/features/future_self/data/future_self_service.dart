import 'package:vitamind/core/constants/app_constants.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class FutureMessage {
  final String id;
  final String message;
  final String deliverAt;
  final bool delivered;
  final String? aiForecast;
  final String createdAt;
  final int daysUntil;
  final bool isPast;

  const FutureMessage({
    required this.id,
    required this.message,
    required this.deliverAt,
    required this.delivered,
    this.aiForecast,
    required this.createdAt,
    required this.daysUntil,
    required this.isPast,
  });

  factory FutureMessage.fromMap(Map<String, dynamic> m) => FutureMessage(
        id: m['id'] as String? ?? '',
        message: m['message'] as String? ?? '',
        deliverAt: m['deliver_at'] as String? ?? '',
        delivered: m['delivered'] as bool? ?? false,
        aiForecast: m['ai_forecast'] as String?,
        createdAt: m['created_at'] as String? ?? '',
        daysUntil: (m['days_until'] as num?)?.toInt() ?? 0,
        isPast: m['is_past'] as bool? ?? false,
      );
}

class FutureSelfService {
  final String _baseUrl;
  FutureSelfService()
      : _baseUrl = AppConstants.apiBaseUrl;

  Future<Map<String, String>> _authHeaders() async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) throw Exception('Not authenticated');
    return {
      'Authorization': 'Bearer ${session.accessToken}',
      'Content-Type': 'application/json',
    };
  }

  Future<List<FutureMessage>> getMessages() async {
    try {
      final dio = Dio();
      final res = await dio.get(
        '$_baseUrl/api/v1/future-self',
        options: Options(headers: await _authHeaders()),
      );
      return (res.data['data'] as List? ?? [])
          .map((e) => FutureMessage.fromMap(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('FutureSelfService.getMessages failed: $e');
      rethrow;
    }
  }

  Future<FutureMessage> createMessage(String message, String deliverAt) async {
    try {
      final dio = Dio();
      final res = await dio.post(
        '$_baseUrl/api/v1/future-self',
        data: {'message': message, 'deliver_at': deliverAt},
        options: Options(headers: await _authHeaders()),
      );
      return FutureMessage.fromMap(res.data['data'] as Map<String, dynamic>);
    } catch (e) {
      debugPrint('FutureSelfService.createMessage failed: $e');
      rethrow;
    }
  }

  Future<void> deleteMessage(String id) async {
    try {
      final dio = Dio();
      await dio.delete(
        '$_baseUrl/api/v1/future-self/$id',
        options: Options(headers: await _authHeaders()),
      );
    } catch (e) {
      debugPrint('FutureSelfService.deleteMessage failed: $e');
      rethrow;
    }
  }
}
