import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/cache_service.dart';

enum TaskPriority { low, medium, high, urgent }
enum TaskStatus { pending, inProgress, completed }
enum RecurrencePattern { daily, weekly, biweekly, monthly }

class Task {
  final String id;
  final String title;
  final String? description;
  final TaskPriority priority;
  final TaskStatus status;
  final String? dueDate;
  final String? goalId;
  final bool isRecurring;
  final RecurrencePattern? recurrencePattern;
  final String? recurrenceEndDate;
  final String? parentTaskId;
  final String? nextOccurrence;
  final DateTime createdAt;

  const Task({
    required this.id,
    required this.title,
    this.description,
    required this.priority,
    required this.status,
    this.dueDate,
    this.goalId,
    this.isRecurring = false,
    this.recurrencePattern,
    this.recurrenceEndDate,
    this.parentTaskId,
    this.nextOccurrence,
    required this.createdAt,
  });

  factory Task.fromMap(Map<String, dynamic> m) {
    return Task(
      id: m['id'] as String,
      title: m['title'] as String,
      description: m['description'] as String?,
      priority: _parsePriority(m['priority'] as String? ?? 'medium'),
      status: _parseStatus(m['status'] as String? ?? 'todo'),
      dueDate: m['due_date'] as String?,
      goalId: m['goal_id'] as String?,
      isRecurring: m['is_recurring'] as bool? ?? false,
      recurrencePattern: _parseRecurrencePattern(m['recurrence_pattern'] as String?),
      recurrenceEndDate: m['recurrence_end_date'] as String?,
      parentTaskId: m['parent_task_id'] as String?,
      nextOccurrence: m['next_occurrence'] as String?,
      createdAt: DateTime.parse(m['created_at'] as String),
    );
  }

  Task copyWith({TaskStatus? status}) => Task(
        id: id,
        title: title,
        description: description,
        priority: priority,
        status: status ?? this.status,
        dueDate: dueDate,
        goalId: goalId,
        isRecurring: isRecurring,
        recurrencePattern: recurrencePattern,
        recurrenceEndDate: recurrenceEndDate,
        parentTaskId: parentTaskId,
        nextOccurrence: nextOccurrence,
        createdAt: createdAt,
      );

  Map<String, dynamic> toMap() => {
        'id': id,
        'title': title,
        'description': description,
        'priority': priority.name,
        'status': _statusToDb(status),
        'due_date': dueDate,
        'goal_id': goalId,
        'is_recurring': isRecurring,
        'recurrence_pattern': recurrencePattern?.name,
        'recurrence_end_date': recurrenceEndDate,
        'parent_task_id': parentTaskId,
        'next_occurrence': nextOccurrence,
        'created_at': createdAt.toIso8601String(),
      };

  static TaskPriority _parsePriority(String v) {
    switch (v) {
      case 'low':
        return TaskPriority.low;
      case 'high':
        return TaskPriority.high;
      case 'urgent':
        return TaskPriority.urgent;
      default:
        return TaskPriority.medium;
    }
  }

  static TaskStatus _parseStatus(String v) {
    switch (v) {
      case 'in_progress':
        return TaskStatus.inProgress;
      case 'completed':
        return TaskStatus.completed;
      default: // 'todo', 'cancelled', unknown
        return TaskStatus.pending;
    }
  }

  static String _statusToDb(TaskStatus s) {
    switch (s) {
      case TaskStatus.inProgress:
        return 'in_progress';
      case TaskStatus.completed:
        return 'completed';
      case TaskStatus.pending:
        return 'todo';
    }
  }

  static RecurrencePattern? _parseRecurrencePattern(String? v) {
    if (v == null) return null;
    switch (v) {
      case 'daily':
        return RecurrencePattern.daily;
      case 'weekly':
        return RecurrencePattern.weekly;
      case 'biweekly':
        return RecurrencePattern.biweekly;
      case 'monthly':
        return RecurrencePattern.monthly;
      default:
        return null;
    }
  }
}

// Pagination metadata returned alongside a page of results
class PaginatedTasks {
  final List<Task> tasks;
  final int total;
  final int page;
  final int limit;
  final bool isFromCache;

  const PaginatedTasks({
    required this.tasks,
    required this.total,
    required this.page,
    required this.limit,
    this.isFromCache = false,
  });

  int get totalPages => total == 0 ? 1 : (total / limit).ceil();
  bool get hasMore => page < totalPages;
}

class TaskService {
  final _supabase = Supabase.instance.client;

  /// Cache key includes status filter so filtered views are cached separately.
  static String _cacheKey(String userId, String? statusFilter) =>
      'tasks_${userId}${statusFilter != null ? '_$statusFilter' : ''}';

  Future<PaginatedTasks> getAll(
    String userId, {
    String? statusFilter,
    int page = 1,
    int limit = 20,
  }) async {
    // Only cache the first page (the default view users see on launch).
    final shouldCache = page == 1;
    final cacheKey = _cacheKey(userId, statusFilter);

    try {
      final result = await _fetchFromNetwork(userId,
          statusFilter: statusFilter, page: page, limit: limit);

      // Persist first-page results for offline access.
      if (shouldCache) {
        await CacheService.save(
          cacheKey,
          result.tasks.map((t) => t.toMap()).toList(),
        );
      }

      return result;
    } catch (e) {
      // Network failed -- try returning cached data for first-page requests.
      if (shouldCache) {
        final cached = await CacheService.load<List<dynamic>>(cacheKey);
        if (cached != null) {
          debugPrint('TaskService: serving cached data for $cacheKey');
          final tasks = cached
              .map((m) => Task.fromMap(m as Map<String, dynamic>))
              .toList();
          return PaginatedTasks(
            tasks: tasks,
            total: tasks.length,
            page: 1,
            limit: limit,
            isFromCache: true,
          );
        }
      }
      rethrow;
    }
  }

  Future<PaginatedTasks> _fetchFromNetwork(
    String userId, {
    String? statusFilter,
    int page = 1,
    int limit = 20,
  }) async {
    final from = (page - 1) * limit;
    final to = from + limit - 1;

    var query = _supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);

    if (statusFilter != null) {
      query = query.eq('status', statusFilter);
    }

    final data = await query.order('created_at', ascending: false).range(from, to);
    final tasks = (data as List)
        .map((m) => Task.fromMap(m as Map<String, dynamic>))
        .toList();

    var countQuery = _supabase
        .from('tasks')
        .select()
        .eq('user_id', userId);

    if (statusFilter != null) {
      countQuery = countQuery.eq('status', statusFilter);
    }

    final countResponse = await countQuery.count(CountOption.exact);
    final total = countResponse.count;

    return PaginatedTasks(
      tasks: tasks,
      total: total,
      page: page,
      limit: limit,
    );
  }

  Future<void> create({
    required String userId,
    required String title,
    String? description,
    TaskPriority priority = TaskPriority.medium,
    String? dueDate,
    String? goalId,
    bool isRecurring = false,
    RecurrencePattern? recurrencePattern,
    String? recurrenceEndDate,
  }) async {
    await _supabase.from('tasks').insert({
      'user_id': userId,
      'title': title,
      if (description != null) 'description': description,
      'priority': priority.name,
      'status': Task._statusToDb(TaskStatus.pending),
      if (dueDate != null) 'due_date': dueDate,
      if (goalId != null) 'goal_id': goalId,
      'is_recurring': isRecurring,
      if (isRecurring && recurrencePattern != null)
        'recurrence_pattern': recurrencePattern.name,
      if (isRecurring && recurrenceEndDate != null)
        'recurrence_end_date': recurrenceEndDate,
      // next_occurrence starts at due_date so the cron function knows when to spawn
      if (isRecurring && dueDate != null) 'next_occurrence': dueDate,
    });
  }

  Future<Task> updateStatus(String taskId, TaskStatus status) async {
    final statusStr = Task._statusToDb(status);
    final data = await _supabase
        .from('tasks')
        .update({
          'status': statusStr,
          if (status == TaskStatus.completed) 'completed_at': DateTime.now().toIso8601String(),
        })
        .eq('id', taskId)
        .select()
        .single();
    return Task.fromMap(data as Map<String, dynamic>);
  }

  Future<void> delete(String taskId) async {
    // Delete subtasks first so they don't become orphaned
    await _supabase.from('tasks').delete().eq('parent_task_id', taskId);
    await _supabase.from('tasks').delete().eq('id', taskId);
  }
}
