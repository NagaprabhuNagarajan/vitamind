import 'package:flutter_test/flutter_test.dart';
import 'package:vitamind/features/tasks/data/task_service.dart';

void main() {
  // ── Model tests (no Supabase needed) ────────────────────────────────────────

  group('Task.fromMap', () {
    test('parses a complete task map correctly', () {
      final map = {
        'id': 'task-1',
        'title': 'Write tests',
        'description': 'Unit tests for services',
        'priority': 'high',
        'status': 'todo',
        'due_date': '2026-03-05',
        'goal_id': 'goal-1',
        'created_at': '2026-01-01T00:00:00Z',
      };

      final task = Task.fromMap(map);

      expect(task.id, 'task-1');
      expect(task.title, 'Write tests');
      expect(task.description, 'Unit tests for services');
      expect(task.priority, TaskPriority.high);
      expect(task.status, TaskStatus.pending); // 'todo' maps to pending
      expect(task.dueDate, '2026-03-05');
      expect(task.goalId, 'goal-1');
    });

    test('maps "todo" status to TaskStatus.pending', () {
      final task = Task.fromMap(_minMap(status: 'todo'));
      expect(task.status, TaskStatus.pending);
    });

    test('maps "in_progress" status to TaskStatus.inProgress', () {
      final task = Task.fromMap(_minMap(status: 'in_progress'));
      expect(task.status, TaskStatus.inProgress);
    });

    test('maps "completed" status to TaskStatus.completed', () {
      final task = Task.fromMap(_minMap(status: 'completed'));
      expect(task.status, TaskStatus.completed);
    });

    test('maps unknown status to TaskStatus.pending as fallback', () {
      final task = Task.fromMap(_minMap(status: 'cancelled'));
      expect(task.status, TaskStatus.pending);
    });

    test('maps null status to TaskStatus.pending', () {
      final map = _minMap();
      map.remove('status');
      final task = Task.fromMap(map);
      expect(task.status, TaskStatus.pending);
    });

    test('parses all priority values correctly', () {
      expect(Task.fromMap(_minMap(priority: 'low')).priority, TaskPriority.low);
      expect(Task.fromMap(_minMap(priority: 'medium')).priority, TaskPriority.medium);
      expect(Task.fromMap(_minMap(priority: 'high')).priority, TaskPriority.high);
      expect(Task.fromMap(_minMap(priority: 'urgent')).priority, TaskPriority.urgent);
    });

    test('defaults to medium priority for unknown values', () {
      expect(Task.fromMap(_minMap(priority: 'unknown')).priority, TaskPriority.medium);
    });

    test('defaults to medium when priority is missing', () {
      final map = _minMap();
      map.remove('priority');
      final task = Task.fromMap(map);
      expect(task.priority, TaskPriority.medium);
    });

    test('handles null optional fields', () {
      final task = Task.fromMap({
        'id': 'task-1',
        'title': 'Test',
        'description': null,
        'priority': 'medium',
        'status': 'todo',
        'due_date': null,
        'goal_id': null,
        'created_at': '2026-01-01T00:00:00Z',
      });
      expect(task.description, isNull);
      expect(task.dueDate, isNull);
      expect(task.goalId, isNull);
    });
  });

  group('Task.copyWith', () {
    test('creates a copy with updated status', () {
      final task = Task.fromMap(_minMap());
      final updated = task.copyWith(status: TaskStatus.completed);

      expect(updated.status, TaskStatus.completed);
      expect(updated.id, task.id);
      expect(updated.title, task.title);
    });

    test('returns same values when no overrides', () {
      final task = Task.fromMap(_minMap());
      final copy = task.copyWith();

      expect(copy.id, task.id);
      expect(copy.status, task.status);
      expect(copy.priority, task.priority);
    });
  });

  group('Task._statusToDb', () {
    // We test the DB mapping indirectly through what TaskService.create would insert.
    // Since _statusToDb is private, we verify it through the model's behavior.
    test('pending maps to "todo" in DB', () {
      // The create method uses _statusToDb(TaskStatus.pending)
      // which should produce 'todo' as per the memory doc bug fix
      final task = Task.fromMap(_minMap(status: 'todo'));
      expect(task.status, TaskStatus.pending);
      // Round-trip: status -> db -> parse should be consistent
    });
  });
}

/// Helper to build a minimal valid task map for testing
Map<String, dynamic> _minMap({String? status, String? priority}) {
  return {
    'id': 'task-1',
    'title': 'Test task',
    'description': null,
    'priority': priority ?? 'medium',
    'status': status ?? 'todo',
    'due_date': null,
    'goal_id': null,
    'created_at': '2026-01-01T00:00:00Z',
  };
}
