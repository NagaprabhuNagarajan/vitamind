import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// A single deep-work focus session, tracking planned vs completed tasks,
/// duration, interruptions, and an auto-computed focus score.
class FocusBlock {
  final String id;
  final String userId;
  final List<String> plannedTasks;
  final List<String> completedTasks;
  final DateTime startedAt;
  final DateTime? endedAt;
  final int durationMinutes;
  final int? focusScore;
  final int interruptions;
  final DateTime createdAt;

  const FocusBlock({
    required this.id,
    required this.userId,
    required this.plannedTasks,
    required this.completedTasks,
    required this.startedAt,
    this.endedAt,
    required this.durationMinutes,
    this.focusScore,
    required this.interruptions,
    required this.createdAt,
  });

  factory FocusBlock.fromMap(Map<String, dynamic> m) {
    return FocusBlock(
      id: m['id'] as String,
      userId: m['user_id'] as String,
      plannedTasks: _parseStringList(m['planned_tasks']),
      completedTasks: _parseStringList(m['completed_tasks']),
      startedAt: DateTime.parse(m['started_at'] as String),
      endedAt: m['ended_at'] != null
          ? DateTime.parse(m['ended_at'] as String)
          : null,
      durationMinutes: (m['duration_minutes'] as num).toInt(),
      focusScore: (m['focus_score'] as num?)?.toInt(),
      interruptions: (m['interruptions'] as num?)?.toInt() ?? 0,
      createdAt: DateTime.parse(m['created_at'] as String),
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'user_id': userId,
        'planned_tasks': plannedTasks,
        'completed_tasks': completedTasks,
        'started_at': startedAt.toIso8601String(),
        'ended_at': endedAt?.toIso8601String(),
        'duration_minutes': durationMinutes,
        'focus_score': focusScore,
        'interruptions': interruptions,
        'created_at': createdAt.toIso8601String(),
      };

  /// Handles both JSON arrays and Postgres text arrays returned by Supabase.
  static List<String> _parseStringList(dynamic value) {
    if (value == null) return [];
    if (value is List) return value.map((e) => e.toString()).toList();
    return [];
  }
}

/// Aggregated focus statistics over a time window.
class FocusStats {
  final int totalSessions;
  final double avgScore;
  final int totalMinutes;
  final int bestStreak;

  const FocusStats({
    required this.totalSessions,
    required this.avgScore,
    required this.totalMinutes,
    required this.bestStreak,
  });
}

class FocusService {
  final _supabase = Supabase.instance.client;

  /// Starts a new focus block with the given planned tasks and duration.
  Future<FocusBlock> startBlock(
    String userId,
    List<String> taskIds,
    int durationMinutes,
  ) async {
    final data = await _supabase
        .from('focus_blocks')
        .insert({
          'user_id': userId,
          'planned_tasks': taskIds,
          'completed_tasks': <String>[],
          'started_at': DateTime.now().toUtc().toIso8601String(),
          'duration_minutes': durationMinutes,
          'interruptions': 0,
        })
        .select()
        .single();

    return FocusBlock.fromMap(data);
  }

  /// Ends a focus block by recording completed tasks, interruptions, and
  /// computing a focus score.
  ///
  /// Score formula: 70% task completion rate + 30 - interruption penalty.
  /// Each interruption costs 5 points (max 30 point penalty).
  /// Final score clamped to 0-100.
  Future<FocusBlock> endBlock(
    String blockId,
    List<String> completedTaskIds,
    int interruptions,
  ) async {
    // Fetch the block to read planned_tasks for score computation.
    final existing = await _supabase
        .from('focus_blocks')
        .select()
        .eq('id', blockId)
        .single();

    final block = FocusBlock.fromMap(existing);

    final plannedCount = block.plannedTasks.length;
    final completedCount = completedTaskIds.length;

    // Avoid division by zero when no tasks were planned.
    final completionRate =
        plannedCount > 0 ? (completedCount / plannedCount) : 1.0;
    final interruptionPenalty = (interruptions * 5).clamp(0, 30);
    final score =
        ((completionRate * 70) + 30 - interruptionPenalty).round().clamp(0, 100);

    final data = await _supabase
        .from('focus_blocks')
        .update({
          'ended_at': DateTime.now().toUtc().toIso8601String(),
          'completed_tasks': completedTaskIds,
          'interruptions': interruptions,
          'focus_score': score,
        })
        .eq('id', blockId)
        .select()
        .single();

    return FocusBlock.fromMap(data);
  }

  /// Returns the currently active (not yet ended) focus block, if any.
  Future<FocusBlock?> getActive(String userId) async {
    try {
      final data = await _supabase
          .from('focus_blocks')
          .select()
          .eq('user_id', userId)
          .isFilter('ended_at', null)
          .order('started_at', ascending: false)
          .limit(1)
          .maybeSingle();

      if (data == null) return null;

      return FocusBlock.fromMap(data);
    } catch (e) {
      debugPrint('FocusService.getActive failed: $e');
      rethrow;
    }
  }

  /// Returns recent focus blocks ordered newest first.
  Future<List<FocusBlock>> getRecent(
    String userId, {
    int limit = 10,
  }) async {
    try {
      final data = await _supabase
          .from('focus_blocks')
          .select()
          .eq('user_id', userId)
          .order('started_at', ascending: false)
          .limit(limit);

      return (data as List)
          .map((m) => FocusBlock.fromMap(m as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('FocusService.getRecent failed: $e');
      rethrow;
    }
  }

  /// Computes aggregate stats from completed focus blocks in the last 30 days.
  Future<FocusStats> getStats(String userId) async {
    final cutoff = DateTime.now().subtract(const Duration(days: 30));
    final cutoffStr = cutoff.toUtc().toIso8601String();

    try {
      final data = await _supabase
          .from('focus_blocks')
          .select()
          .eq('user_id', userId)
          .not('ended_at', 'is', null)
          .gte('started_at', cutoffStr)
          .order('started_at');

      final blocks = (data as List)
          .map((m) => FocusBlock.fromMap(m as Map<String, dynamic>))
          .toList();

      if (blocks.isEmpty) {
        return const FocusStats(
          totalSessions: 0,
          avgScore: 0,
          totalMinutes: 0,
          bestStreak: 0,
        );
      }

      final totalSessions = blocks.length;
      final totalMinutes =
          blocks.fold<int>(0, (sum, b) => sum + b.durationMinutes);
      final scoredBlocks = blocks.where((b) => b.focusScore != null).toList();
      final avgScore = scoredBlocks.isEmpty
          ? 0.0
          : scoredBlocks.fold<int>(0, (sum, b) => sum + b.focusScore!) /
              scoredBlocks.length;

      // Best streak: consecutive days with at least one focus block.
      final bestStreak = _computeBestStreak(blocks);

      return FocusStats(
        totalSessions: totalSessions,
        avgScore: avgScore,
        totalMinutes: totalMinutes,
        bestStreak: bestStreak,
      );
    } catch (e) {
      debugPrint('FocusService.getStats failed: $e');
      rethrow;
    }
  }

  /// Finds the longest run of consecutive calendar days that each contain
  /// at least one focus block.
  int _computeBestStreak(List<FocusBlock> blocks) {
    if (blocks.isEmpty) return 0;

    // Collect unique dates (local time) from the blocks.
    final dates = blocks
        .map((b) {
          final local = b.startedAt.toLocal();
          return DateTime(local.year, local.month, local.day);
        })
        .toSet()
        .toList()
      ..sort();

    int best = 1;
    int current = 1;

    for (int i = 1; i < dates.length; i++) {
      final diff = dates[i].difference(dates[i - 1]).inDays;
      if (diff == 1) {
        current++;
        if (current > best) best = current;
      } else {
        current = 1;
      }
    }

    return best;
  }
}
