import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/cache_service.dart';
import '../../tasks/data/task_service.dart';

/// Service for fetching AI-decomposed subtasks.
///
/// The actual decomposition is performed server-side via the web API.
/// This service reads the resulting subtasks directly from Supabase
/// using the parent_task_id foreign key on the tasks table.
class DecompositionService {
  final _supabase = Supabase.instance.client;

  static String _cacheKey(String parentTaskId) =>
      'subtasks_$parentTaskId';

  /// Fetches all subtasks belonging to a parent task.
  /// Subtasks are identified by having parent_task_id set and
  /// optionally is_subtask = true.
  Future<List<Task>> getSubtasks(String parentTaskId) async {
    final cacheKey = _cacheKey(parentTaskId);

    try {
      final data = await _supabase
          .from('tasks')
          .select()
          .eq('parent_task_id', parentTaskId)
          .order('created_at');

      final tasks = (data as List)
          .map((m) => Task.fromMap(m as Map<String, dynamic>))
          .toList();

      await CacheService.save(
        cacheKey,
        tasks.map((t) => t.toMap()).toList(),
      );

      return tasks;
    } catch (e) {
      debugPrint('DecompositionService.getSubtasks failed: $e');

      final cached = await CacheService.load<List<dynamic>>(cacheKey);
      if (cached != null) {
        debugPrint('DecompositionService: serving cached subtasks');
        return cached
            .map((m) => Task.fromMap(m as Map<String, dynamic>))
            .toList();
      }
      rethrow;
    }
  }
}
