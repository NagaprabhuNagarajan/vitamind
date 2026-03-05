import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../data/goal_service.dart';

abstract class GoalsEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class GoalsLoadRequested extends GoalsEvent {}

/// Loads the next page of goals — appends to existing list
class GoalsLoadMoreRequested extends GoalsEvent {}

class GoalCreateRequested extends GoalsEvent {
  final String title;
  final String? description;
  final String? targetDate;
  GoalCreateRequested({required this.title, this.description, this.targetDate});
  @override
  List<Object?> get props => [title];
}

class GoalProgressUpdated extends GoalsEvent {
  final String goalId;
  final int progress;
  GoalProgressUpdated({required this.goalId, required this.progress});
  @override
  List<Object?> get props => [goalId, progress];
}

class GoalDeleteRequested extends GoalsEvent {
  final String goalId;
  GoalDeleteRequested(this.goalId);
  @override
  List<Object?> get props => [goalId];
}

abstract class GoalsState extends Equatable {
  @override
  List<Object?> get props => [];
}

class GoalsInitial extends GoalsState {}
class GoalsLoading extends GoalsState {}

class GoalsSuccess extends GoalsState {
  final List<Goal> goals;
  final int currentPage;
  final int totalPages;
  final bool hasMore;
  final bool isLoadingMore;
  /// True when the data was loaded from local cache (offline mode).
  final bool isFromCache;

  GoalsSuccess(
    this.goals, {
    this.currentPage = 1,
    this.totalPages = 1,
    this.hasMore = false,
    this.isLoadingMore = false,
    this.isFromCache = false,
  });

  GoalsSuccess copyWith({
    List<Goal>? goals,
    int? currentPage,
    int? totalPages,
    bool? hasMore,
    bool? isLoadingMore,
    bool? isFromCache,
  }) =>
      GoalsSuccess(
        goals ?? this.goals,
        currentPage: currentPage ?? this.currentPage,
        totalPages: totalPages ?? this.totalPages,
        hasMore: hasMore ?? this.hasMore,
        isLoadingMore: isLoadingMore ?? this.isLoadingMore,
        isFromCache: isFromCache ?? this.isFromCache,
      );

  @override
  List<Object?> get props => [goals, currentPage, totalPages, hasMore, isLoadingMore, isFromCache];
}

class GoalsError extends GoalsState {
  final String message;
  GoalsError(this.message);
  @override
  List<Object?> get props => [message];
}

class GoalsBloc extends Bloc<GoalsEvent, GoalsState> {
  final GoalService _service;
  final String _userId;

  GoalsBloc(this._service, this._userId) : super(GoalsInitial()) {
    on<GoalsLoadRequested>(_onLoad);
    on<GoalsLoadMoreRequested>(_onLoadMore);
    on<GoalCreateRequested>(_onCreate);
    on<GoalProgressUpdated>(_onProgressUpdate);
    on<GoalDeleteRequested>(_onDelete);
  }

  Future<void> _onLoad(GoalsLoadRequested event, Emitter<GoalsState> emit) async {
    emit(GoalsLoading());
    try {
      final result = await _service.getAll(_userId);
      emit(GoalsSuccess(
        result.goals,
        currentPage: result.page,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
        isFromCache: result.isFromCache,
      ));
    } catch (e) {
      emit(GoalsError(e.toString()));
    }
  }

  Future<void> _onLoadMore(GoalsLoadMoreRequested event, Emitter<GoalsState> emit) async {
    final current = state;
    if (current is! GoalsSuccess || !current.hasMore || current.isLoadingMore) return;

    emit(current.copyWith(isLoadingMore: true));
    try {
      final nextPage = current.currentPage + 1;
      final result = await _service.getAll(_userId, page: nextPage);
      emit(GoalsSuccess(
        [...current.goals, ...result.goals],
        currentPage: result.page,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
      ));
    } catch (e) {
      emit(current.copyWith(isLoadingMore: false));
    }
  }

  Future<void> _onCreate(GoalCreateRequested event, Emitter<GoalsState> emit) async {
    try {
      await _service.create(
        userId: _userId,
        title: event.title,
        description: event.description,
        targetDate: event.targetDate,
      );
      add(GoalsLoadRequested());
    } catch (e) {
      emit(GoalsError(e.toString()));
    }
  }

  Future<void> _onProgressUpdate(GoalProgressUpdated event, Emitter<GoalsState> emit) async {
    if (state is GoalsSuccess) {
      final current = state as GoalsSuccess;
      final updated = current.goals
          .map((g) => g.id == event.goalId
              ? g.copyWith(progress: event.progress, isCompleted: event.progress >= 100)
              : g)
          .toList();
      emit(current.copyWith(goals: updated));
    }
    try {
      await _service.updateProgress(event.goalId, event.progress);
    } catch (_) {
      add(GoalsLoadRequested());
    }
  }

  Future<void> _onDelete(GoalDeleteRequested event, Emitter<GoalsState> emit) async {
    if (state is GoalsSuccess) {
      final current = state as GoalsSuccess;
      emit(current.copyWith(goals: current.goals.where((g) => g.id != event.goalId).toList()));
    }
    try {
      await _service.delete(event.goalId);
    } catch (_) {
      add(GoalsLoadRequested());
    }
  }
}
