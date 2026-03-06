import 'package:flutter_test/flutter_test.dart';
import 'package:vitamind/features/tasks/data/task_service.dart';

void main() {
  test('Task.fromMap parses correctly', () {
    final task = Task.fromMap({
      'id': 'abc-123',
      'title': 'Test task',
      'description': 'A description',
      'priority': 'high',
      'status': 'todo',
      'due_date': '2026-03-10',
      'goal_id': null,
      'created_at': '2026-01-01T00:00:00Z',
    });

    expect(task.id, 'abc-123');
    expect(task.title, 'Test task');
    expect(task.priority, TaskPriority.high);
    expect(task.status, TaskStatus.pending); // 'todo' maps to pending
  });

  test('Task.toMap round-trips status correctly', () {
    final task = Task.fromMap({
      'id': 'x',
      'title': 'T',
      'priority': 'medium',
      'status': 'in_progress',
      'created_at': '2026-01-01T00:00:00Z',
    });

    final map = task.toMap();
    expect(map['status'], 'in_progress');
    expect(map['priority'], 'medium');
  });
}
