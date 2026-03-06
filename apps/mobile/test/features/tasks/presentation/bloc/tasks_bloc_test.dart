import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:vitamind/features/tasks/data/task_service.dart';
import 'package:vitamind/features/tasks/presentation/bloc/tasks_bloc.dart';

class MockTaskService extends Mock implements TaskService {}

void main() {
  late MockTaskService mockService;
  const userId = 'user-123';

  final sampleTasks = [
    Task.fromMap({
      'id': 't1',
      'title': 'Task one',
      'description': null,
      'priority': 'high',
      'status': 'todo',
      'due_date': null,
      'goal_id': null,
      'created_at': '2026-01-01T00:00:00Z',
    }),
    Task.fromMap({
      'id': 't2',
      'title': 'Task two',
      'description': null,
      'priority': 'medium',
      'status': 'in_progress',
      'due_date': '2026-03-05',
      'goal_id': null,
      'created_at': '2026-01-02T00:00:00Z',
    }),
  ];

  PaginatedTasks paginated(List<Task> tasks) => PaginatedTasks(
        tasks: tasks,
        total: tasks.length,
        page: 1,
        limit: 20,
      );

  setUp(() {
    mockService = MockTaskService();
  });

  group('TasksBloc', () {
    // ── Initial state ─────────────────────────────────────────────────────────
    test('initial state is TasksInitial', () {
      final bloc = TasksBloc(mockService, userId);
      expect(bloc.state, isA<TasksInitial>());
      bloc.close();
    });

    // ── Load ──────────────────────────────────────────────────────────────────
    blocTest<TasksBloc, TasksState>(
      'emits [Loading, Success] on successful load',
      build: () {
        when(() => mockService.getAll(userId, statusFilter: any(named: 'statusFilter'), page: any(named: 'page'), limit: any(named: 'limit')))
            .thenAnswer((_) async => paginated(sampleTasks));
        return TasksBloc(mockService, userId);
      },
      act: (bloc) => bloc.add(TasksLoadRequested()),
      expect: () => [
        isA<TasksLoading>(),
        isA<TasksSuccess>()
            .having((s) => s.tasks.length, 'tasks count', 2),
      ],
    );

    blocTest<TasksBloc, TasksState>(
      'emits [Loading, Error] when load fails',
      build: () {
        when(() => mockService.getAll(userId, statusFilter: any(named: 'statusFilter'), page: any(named: 'page'), limit: any(named: 'limit')))
            .thenThrow(Exception('Network error'));
        return TasksBloc(mockService, userId);
      },
      act: (bloc) => bloc.add(TasksLoadRequested()),
      expect: () => [
        isA<TasksLoading>(),
        isA<TasksError>()
            .having((s) => s.message, 'message', contains('Network error')),
      ],
    );

    // ── Create ────────────────────────────────────────────────────────────────
    blocTest<TasksBloc, TasksState>(
      'create triggers a reload on success',
      build: () {
        when(() => mockService.create(
              userId: userId,
              title: 'New task',
              description: null,
              priority: TaskPriority.medium,
              dueDate: null,
            )).thenAnswer((_) async {});
        when(() => mockService.getAll(userId, statusFilter: any(named: 'statusFilter'), page: any(named: 'page'), limit: any(named: 'limit')))
            .thenAnswer((_) async => paginated(sampleTasks));
        return TasksBloc(mockService, userId);
      },
      act: (bloc) => bloc.add(TaskCreateRequested(
        title: 'New task',
        priority: TaskPriority.medium,
      )),
      verify: (_) {
        verify(() => mockService.create(
              userId: userId,
              title: 'New task',
              description: null,
              priority: TaskPriority.medium,
              dueDate: null,
            )).called(1);
      },
    );

    blocTest<TasksBloc, TasksState>(
      'create emits error then reloads on failure',
      build: () {
        when(() => mockService.create(
              userId: userId,
              title: 'Fail',
              description: null,
              priority: TaskPriority.medium,
              dueDate: null,
            )).thenThrow(Exception('insert failed'));
        when(() => mockService.getAll(userId, statusFilter: any(named: 'statusFilter'), page: any(named: 'page'), limit: any(named: 'limit')))
            .thenAnswer((_) async => paginated([]));
        return TasksBloc(mockService, userId);
      },
      act: (bloc) => bloc.add(TaskCreateRequested(
        title: 'Fail',
        priority: TaskPriority.medium,
      )),
      expect: () => [
        isA<TasksError>()
            .having((s) => s.message, 'msg', contains('Failed to create task')),
        // Then the reload kicks in
        isA<TasksLoading>(),
        isA<TasksSuccess>(),
      ],
    );

    // ── Status Update (optimistic) ────────────────────────────────────────────
    blocTest<TasksBloc, TasksState>(
      'status update optimistically updates the task list',
      seed: () => TasksSuccess(sampleTasks),
      build: () {
        when(() => mockService.updateStatus('t1', TaskStatus.completed))
            .thenAnswer((_) async => sampleTasks[0].copyWith(status: TaskStatus.completed));
        return TasksBloc(mockService, userId);
      },
      act: (bloc) => bloc.add(TaskStatusUpdateRequested(
        taskId: 't1',
        status: TaskStatus.completed,
      )),
      expect: () => [
        isA<TasksSuccess>().having(
          (s) => s.tasks.firstWhere((t) => t.id == 't1').status,
          'updated task status',
          TaskStatus.completed,
        ),
      ],
    );

    blocTest<TasksBloc, TasksState>(
      'status update reverts on failure by reloading',
      seed: () => TasksSuccess(sampleTasks),
      build: () {
        when(() => mockService.updateStatus('t1', TaskStatus.completed))
            .thenThrow(Exception('update failed'));
        when(() => mockService.getAll(userId, statusFilter: any(named: 'statusFilter'), page: any(named: 'page'), limit: any(named: 'limit')))
            .thenAnswer((_) async => paginated(sampleTasks));
        return TasksBloc(mockService, userId);
      },
      act: (bloc) => bloc.add(TaskStatusUpdateRequested(
        taskId: 't1',
        status: TaskStatus.completed,
      )),
      // Optimistic update emitted, then reload triggered
      expect: () => [
        isA<TasksSuccess>(), // optimistic
        isA<TasksLoading>(), // reload
        isA<TasksSuccess>(), // original data restored
      ],
    );

    // ── Delete (optimistic) ───────────────────────────────────────────────────
    blocTest<TasksBloc, TasksState>(
      'delete optimistically removes task from list',
      seed: () => TasksSuccess(sampleTasks),
      build: () {
        when(() => mockService.delete('t1')).thenAnswer((_) async {});
        return TasksBloc(mockService, userId);
      },
      act: (bloc) => bloc.add(TaskDeleteRequested('t1')),
      expect: () => [
        isA<TasksSuccess>()
            .having((s) => s.tasks.length, 'count after delete', 1)
            .having((s) => s.tasks.first.id, 'remaining task', 't2'),
      ],
    );

    blocTest<TasksBloc, TasksState>(
      'delete reloads on failure',
      seed: () => TasksSuccess(sampleTasks),
      build: () {
        when(() => mockService.delete('t1')).thenThrow(Exception('fail'));
        when(() => mockService.getAll(userId, statusFilter: any(named: 'statusFilter'), page: any(named: 'page'), limit: any(named: 'limit')))
            .thenAnswer((_) async => paginated(sampleTasks));
        return TasksBloc(mockService, userId);
      },
      act: (bloc) => bloc.add(TaskDeleteRequested('t1')),
      expect: () => [
        isA<TasksSuccess>().having((s) => s.tasks.length, 'optimistic', 1),
        isA<TasksLoading>(),
        isA<TasksSuccess>().having((s) => s.tasks.length, 'reverted', 2),
      ],
    );

    // ── Filter Changed ────────────────────────────────────────────────────────
    blocTest<TasksBloc, TasksState>(
      'filter change triggers a reload',
      build: () {
        when(() => mockService.getAll(userId, statusFilter: any(named: 'statusFilter'), page: any(named: 'page'), limit: any(named: 'limit')))
            .thenAnswer((_) async => paginated(sampleTasks));
        return TasksBloc(mockService, userId);
      },
      act: (bloc) => bloc.add(TaskFilterChanged('completed')),
      expect: () => [
        isA<TasksLoading>(),
        isA<TasksSuccess>(),
      ],
    );
  });
}
