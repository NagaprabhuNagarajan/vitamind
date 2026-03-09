import 'package:vitamind/core/constants/app_constants.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class CaptureSuggestion {
  final String id;
  final String source; // calendar | pattern
  final String type; // task | habit_log | health_entry
  final String title;
  final String? description;
  final String? dueDate;
  final String? dueTime;
  final String priority;
  final int confidence;

  const CaptureSuggestion({
    required this.id,
    required this.source,
    required this.type,
    required this.title,
    this.description,
    this.dueDate,
    this.dueTime,
    required this.priority,
    required this.confidence,
  });

  factory CaptureSuggestion.fromMap(Map<String, dynamic> m) => CaptureSuggestion(
        id: m['id'] as String? ?? '',
        source: m['source'] as String? ?? 'pattern',
        type: m['type'] as String? ?? 'task',
        title: m['title'] as String? ?? '',
        description: m['description'] as String?,
        dueDate: m['due_date'] as String?,
        dueTime: m['due_time'] as String?,
        priority: m['priority'] as String? ?? 'medium',
        confidence: (m['confidence'] as num?)?.toInt() ?? 70,
      );
}

class QuickLogResult {
  final List<String> actionsTaken;
  final int tasksCreated;
  final int habitsLogged;
  final int healthEntriesCreated;

  const QuickLogResult({
    required this.actionsTaken,
    required this.tasksCreated,
    required this.habitsLogged,
    required this.healthEntriesCreated,
  });

  factory QuickLogResult.fromMap(Map<String, dynamic> m) => QuickLogResult(
        actionsTaken: List<String>.from(m['actions_taken'] as List? ?? []),
        tasksCreated: (m['tasks_created'] as num?)?.toInt() ?? 0,
        habitsLogged: (m['habits_logged'] as num?)?.toInt() ?? 0,
        healthEntriesCreated: (m['health_entries_created'] as num?)?.toInt() ?? 0,
      );
}

class AutoCaptureService {
  final String _baseUrl;
  AutoCaptureService()
      : _baseUrl = AppConstants.apiBaseUrl;

  Future<Map<String, String>> _authHeaders() async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) throw Exception('Not authenticated');
    return {
      'Authorization': 'Bearer ${session.accessToken}',
      'Content-Type': 'application/json',
    };
  }

  Future<List<CaptureSuggestion>> getSuggestions() async {
    try {
      final dio = Dio();
      final res = await dio.get(
        '$_baseUrl/api/v1/auto-capture',
        options: Options(headers: await _authHeaders()),
      );
      return (res.data['data'] as List? ?? [])
          .map((e) => CaptureSuggestion.fromMap(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('AutoCaptureService.getSuggestions failed: $e');
      rethrow;
    }
  }

  Future<void> importSuggestion(CaptureSuggestion s) async {
    try {
      final dio = Dio();
      await dio.post(
        '$_baseUrl/api/v1/auto-capture/import',
        data: {
          'title': s.title,
          'due_date': s.dueDate,
          'due_time': s.dueTime,
          'priority': s.priority,
        },
        options: Options(headers: await _authHeaders()),
      );
    } catch (e) {
      debugPrint('AutoCaptureService.importSuggestion failed: $e');
      rethrow;
    }
  }

  Future<QuickLogResult> quickLog(String text) async {
    try {
      final dio = Dio();
      final res = await dio.post(
        '$_baseUrl/api/v1/auto-capture',
        data: {'text': text},
        options: Options(headers: await _authHeaders()),
      );
      return QuickLogResult.fromMap(res.data['data'] as Map<String, dynamic>);
    } catch (e) {
      debugPrint('AutoCaptureService.quickLog failed: $e');
      rethrow;
    }
  }
}
