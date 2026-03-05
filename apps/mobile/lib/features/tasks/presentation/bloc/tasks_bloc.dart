import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../data/task_service.dart';

// ─── Events ───────────────────────────────────────────────────────────────────

abstract class TasksEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class TasksLoadRequested extends TasksEvent {}

/// Loads the next page of tasks — appends to existing list
class TasksLoadMoreRequested extends TasksEvent {}

class TaskCreateRequested extends TasksEvent {
  final String title;
  final String? description;
  final TaskPriority priority;
  final String? dueDate;
  TaskCreateRequested({required this.title, this.description, required this.priority, this.dueDate});
  @override
  List<Object?> get props => [title, priority, dueDate];
}

class TaskStatusUpdateRequested extends TasksEvent {
  final String taskId;
  final TaskStatus status;
  TaskStatusUpdateRequested({required this.taskId, required this.status});
  @override
  List<Object?> get props => [taskId, status];
}

class TaskDeleteRequested extends TasksEvent {
  final String taskId;
  TaskDeleteRequested(this.taskId);
  @override
  List<Object?> get props => [taskId];
}

class TaskFilterChanged extends TasksEvent {
  final String? status; // null = all
  TaskFilterChanged(this.status);
}

// ─── States ───────────────────────────────────────────────────────────────────

abstract class TasksState extends Equatable {
  @override
  List<Object?> get props => [];
}

class TasksInitial extends TasksState {}
class TasksLoading extends TasksState {}

class TasksSuccess extends TasksState {
  final List<Task> tasks;
  final String? filter;
  final int currentPage;
  final int totalPages;
  final bool hasMore;
  final bool isLoadingMore;
  /// True when the data was loaded from local cache (offline mode).
  final bool isFromCache;

  TasksSuccess(
    this.tasks, {
    this.filter,
    this.currentPage = 1,
    this.totalPages = 1,
    this.hasMore = false,
    this.isLoadingMore = false,
    this.isFromCache = false,
  });

  TasksSuccess copyWith({
    List<Task>? tasks,
    String? filter,
    int? currentPage,
    int? totalPages,
    bool? hasMore,
    bool? isLoadingMore,
    bool? isFromCache,
  }) =>
      TasksSuccess(
        tasks ?? this.tasks,
        filter: filter ?? this.filter,
        currentPage: currentPage ?? this.currentPage,
        totalPages: totalPages ?? this.totalPages,
        hasMore: hasMore ?? this.hasMore,
        isLoadingMore: isLoadingMore ?? this.isLoadingMore,
        isFromCache: isFromCache ?? this.isFromCache,
      );

  @override
  List<Object?> get props => [tasks, filter, currentPage, totalPages, hasMore, isLoadingMore, isFromCache];
}

class TasksError extends TasksState {
  final String message;
  TasksError(this.message);
  @override
  List<Object?> get props => [message];
}

// ─── Bloc ─────────────────────────────────────────────────────────────────────

class TasksBloc extends Bloc<TasksEvent, TasksState> {
  final TaskService _service;
  final String _userId;
  String? _currentFilter;

  TasksBloc(this._service, this._userId) : super(TasksInitial()) {
    on<TasksLoadRequested>(_onLoad);
    on<TasksLoadMoreRequested>(_onLoadMore);
    on<TaskCreateRequested>(_onCreate);
    on<TaskStatusUpdateRequested>(_onStatusUpdate);
    on<TaskDeleteRequested>(_onDelete);
    on<TaskFilterChanged>(_onFilterChanged);
  }

  Future<void> _onLoad(TasksLoadRequested event, Emitter<TasksState> emit) async {
    emit(TasksLoading());
    try {
      final result = await _service.getAll(_userId, statusFilter: _currentFilter);
      emit(TasksSuccess(
        result.tasks,
        filter: _currentFilter,
        currentPage: result.page,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
        isFromCache: result.isFromCache,
      ));
    } catch (e) {
      emit(TasksError(e.toString()));
    }
  }

  Future<void> _onLoadMore(TasksLoadMoreRequested event, Emitter<TasksState> emit) async {
    final current = state;
    if (current is! TasksSuccess || !current.hasMore || current.isLoadingMore) return;

    emit(current.copyWith(isLoadingMore: true));
    try {
      final nextPage = current.currentPage + 1;
      final result = await _service.getAll(
        _userId,
        statusFilter: _currentFilter,
        page: nextPage,
      );
      emit(TasksSuccess(
        [...current.tasks, ...result.tasks],
        filter: _currentFilter,
        currentPage: result.page,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
      ));
    } catch (e) {
      // Revert loading state on failure, keep existing data
      emit(current.copyWith(isLoadingMore: false));
    }
  }

  Future<void> _onCreate(TaskCreateRequested event, Emitter<TasksState> emit) async {
    // Keep current list visible while creating
    final prev = state;
    try {
      await _service.create(
        userId: _userId,
        title: event.title,
        description: event.description,
        priority: event.priority,
        dueDate: event.dueDate,
      );
      add(TasksLoadRequested());
    } catch (e) {
      // Restore previous state and surface the error as a message
      if (prev is TasksSuccess) emit(prev);
      emit(TasksError('Failed to create task: $e'));
      add(TasksLoadRequested());
    }
  }

  Future<void> _onStatusUpdate(TaskStatusUpdateRequested event, Emitter<TasksState> emit) async {
    if (state is TasksSuccess) {
      final current = state as TasksSuccess;
      // Optimistic update
      final updated = current.tasks
          .map((t) => t.id == event.taskId ? t.copyWith(status: event.status) : t)
          .toList();
      emit(current.copyWith(tasks: updated));
    }
    try {
      await _service.updateStatus(event.taskId, event.status);
    } catch (_) {
      add(TasksLoadRequested()); // revert on failure
    }
  }

  Future<void> _onDelete(TaskDeleteRequested event, Emitter<TasksState> emit) async {
    if (state is TasksSuccess) {
      final current = state as TasksSuccess;
      emit(current.copyWith(
        tasks: current.tasks.where((t) => t.id != event.taskId).toList(),
      ));
    }
    try {
      await _service.delete(event.taskId);
    } catch (_) {
      add(TasksLoadRequested());
    }
  }

  void _onFilterChanged(TaskFilterChanged event, Emitter<TasksState> emit) {
    _currentFilter = event.status;
    add(TasksLoadRequested());
  }
}
