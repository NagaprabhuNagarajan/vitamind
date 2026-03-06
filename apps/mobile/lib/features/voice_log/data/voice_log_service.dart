import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// A voice-to-text log entry. The transcript is inserted directly from the
/// mobile client; AI-powered action extraction (populating [actions]) happens
/// server-side via an Edge Function / database trigger.
class VoiceLog {
  final String id;
  final String userId;
  final String transcript;
  final Map<String, dynamic>? actions;
  final int? durationMs;
  final DateTime createdAt;

  const VoiceLog({
    required this.id,
    required this.userId,
    required this.transcript,
    this.actions,
    this.durationMs,
    required this.createdAt,
  });

  factory VoiceLog.fromMap(Map<String, dynamic> m) {
    return VoiceLog(
      id: m['id'] as String,
      userId: m['user_id'] as String,
      transcript: m['transcript'] as String,
      actions: m['actions'] as Map<String, dynamic>?,
      durationMs: (m['duration_ms'] as num?)?.toInt(),
      createdAt: DateTime.parse(m['created_at'] as String),
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'user_id': userId,
        'transcript': transcript,
        'actions': actions,
        'duration_ms': durationMs,
        'created_at': createdAt.toIso8601String(),
      };
}

class VoiceLogService {
  final _supabase = Supabase.instance.client;

  /// Inserts a new voice transcript. The [actions] field is left null because
  /// AI processing runs server-side asynchronously after the row is created.
  Future<VoiceLog> submitLog(
    String userId,
    String transcript, {
    int? durationMs,
  }) async {
    final data = await _supabase
        .from('voice_logs')
        .insert({
          'user_id': userId,
          'transcript': transcript,
          if (durationMs != null) 'duration_ms': durationMs,
        })
        .select()
        .single();

    return VoiceLog.fromMap(data);
  }

  /// Returns the most recent voice logs, ordered newest first.
  Future<List<VoiceLog>> fetchRecent(
    String userId, {
    int limit = 10,
  }) async {
    try {
      final data = await _supabase
          .from('voice_logs')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(limit);

      return (data as List)
          .map((m) => VoiceLog.fromMap(m as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('VoiceLogService.fetchRecent failed: $e');
      rethrow;
    }
  }
}
