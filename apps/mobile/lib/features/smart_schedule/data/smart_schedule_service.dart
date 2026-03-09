import 'package:vitamind/core/constants/app_constants.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// A single AI-suggested time slot for scheduling a task.
class TimeSlot {
  final String time;   // HH:MM (24-hour)
  final String label;  // "9:00 AM"
  final String reason;

  const TimeSlot({
    required this.time,
    required this.label,
    required this.reason,
  });

  factory TimeSlot.fromMap(Map<String, dynamic> m) => TimeSlot(
        time: m['time'] as String,
        label: m['label'] as String,
        reason: m['reason'] as String,
      );
}

class SmartScheduleResult {
  final List<TimeSlot> slots;
  final bool usedFingerprint;
  final bool usedCalendar;

  const SmartScheduleResult({
    required this.slots,
    required this.usedFingerprint,
    required this.usedCalendar,
  });

  factory SmartScheduleResult.fromMap(Map<String, dynamic> m) {
    final slotsList = (m['slots'] as List? ?? [])
        .map((s) => TimeSlot.fromMap(s as Map<String, dynamic>))
        .toList();
    return SmartScheduleResult(
      slots: slotsList,
      usedFingerprint: m['used_fingerprint'] as bool? ?? false,
      usedCalendar: m['used_calendar'] as bool? ?? false,
    );
  }
}

class SmartScheduleService {
  /// Asks the AI to suggest optimal time slots for [title] on [date].
  /// Returns up to 3 time slot suggestions based on Time Fingerprint + calendar.
  Future<SmartScheduleResult> suggestSlots({
    required String title,
    required String priority,
    String? date,
    int? estimatedMinutes,
  }) async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) throw Exception('Not authenticated');

    final baseUrl = AppConstants.apiBaseUrl;

    try {
      final dio = Dio();
      final body = <String, dynamic>{
        'title': title,
        'priority': priority,
        if (date != null) 'date': date,
        if (estimatedMinutes != null) 'estimated_minutes': estimatedMinutes,
      };

      final response = await dio.post(
        '$baseUrl/api/v1/smart-schedule',
        data: body,
        options: Options(
          headers: {
            'Authorization': 'Bearer ${session.accessToken}',
            'Content-Type': 'application/json',
          },
        ),
      );

      return SmartScheduleResult.fromMap(
        response.data['data'] as Map<String, dynamic>,
      );
    } catch (e) {
      debugPrint('SmartScheduleService.suggestSlots failed: $e');
      rethrow;
    }
  }
}
