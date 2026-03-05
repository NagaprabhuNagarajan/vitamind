import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../data/habit_service.dart';

abstract class HabitsEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class HabitsLoadRequested extends HabitsEvent {}

/// Loads the next page of habits — appends to existing list
class HabitsLoadMoreRequested extends HabitsEvent {}

class HabitCreateRequested extends HabitsEvent {
  final String title;
  final String frequency;
  final String? reminderTime;
  HabitCreateRequested({required this.title, this.frequency = 'daily', this.reminderTime});
  @override
  List<Object?> get props => [title, frequency, reminderTime];
}

class HabitLogRequested extends HabitsEvent {
  final String habitId;
  HabitLogRequested(this.habitId);
  @override
  List<Object?> get props => [habitId];
}

class HabitDeleteRequested extends HabitsEvent {
  final String habitId;
  HabitDeleteRequested(this.habitId);
  @override
  List<Object?> get props => [habitId];
}

abstract class HabitsState extends Equatable {
  @override
  List<Object?> get props => [];
}

class HabitsInitial extends HabitsState {}
class HabitsLoading extends HabitsState {}

class HabitsSuccess extends HabitsState {
  final List<Habit> habits;
  final int currentPage;
  final int totalPages;
  final bool hasMore;
  final bool isLoadingMore;
  /// True when the data was loaded from local cache (offline mode).
  final bool isFromCache;

  HabitsSuccess(
    this.habits, {
    this.currentPage = 1,
    this.totalPages = 1,
    this.hasMore = false,
    this.isLoadingMore = false,
    this.isFromCache = false,
  });

  HabitsSuccess copyWith({
    List<Habit>? habits,
    int? currentPage,
    int? totalPages,
    bool? hasMore,
    bool? isLoadingMore,
    bool? isFromCache,
  }) =>
      HabitsSuccess(
        habits ?? this.habits,
        currentPage: currentPage ?? this.currentPage,
        totalPages: totalPages ?? this.totalPages,
        hasMore: hasMore ?? this.hasMore,
        isLoadingMore: isLoadingMore ?? this.isLoadingMore,
        isFromCache: isFromCache ?? this.isFromCache,
      );

  @override
  List<Object?> get props => [habits, currentPage, totalPages, hasMore, isLoadingMore, isFromCache];
}

class HabitsError extends HabitsState {
  final String message;
  HabitsError(this.message);
  @override
  List<Object?> get props => [message];
}

class HabitsBloc extends Bloc<HabitsEvent, HabitsState> {
  final HabitService _service;
  final String _userId;

  HabitsBloc(this._service, this._userId) : super(HabitsInitial()) {
    on<HabitsLoadRequested>(_onLoad);
    on<HabitsLoadMoreRequested>(_onLoadMore);
    on<HabitCreateRequested>(_onCreate);
    on<HabitLogRequested>(_onLog);
    on<HabitDeleteRequested>(_onDelete);
  }

  Future<void> _onLoad(HabitsLoadRequested event, Emitter<HabitsState> emit) async {
    emit(HabitsLoading());
    try {
      final result = await _service.getAllWithTodayStatus(_userId);
      emit(HabitsSuccess(
        result.habits,
        currentPage: result.page,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
        isFromCache: result.isFromCache,
      ));
    } catch (e) {
      emit(HabitsError(e.toString()));
    }
  }

  Future<void> _onLoadMore(HabitsLoadMoreRequested event, Emitter<HabitsState> emit) async {
    final current = state;
    if (current is! HabitsSuccess || !current.hasMore || current.isLoadingMore) return;

    emit(current.copyWith(isLoadingMore: true));
    try {
      final nextPage = current.currentPage + 1;
      final result = await _service.getAllWithTodayStatus(_userId, page: nextPage);
      emit(HabitsSuccess(
        [...current.habits, ...result.habits],
        currentPage: result.page,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
      ));
    } catch (e) {
      emit(current.copyWith(isLoadingMore: false));
    }
  }

  Future<void> _onCreate(HabitCreateRequested event, Emitter<HabitsState> emit) async {
    try {
      await _service.create(userId: _userId, title: event.title, frequency: event.frequency, reminderTime: event.reminderTime);
      add(HabitsLoadRequested());
    } catch (e) {
      emit(HabitsError(e.toString()));
    }
  }

  Future<void> _onLog(HabitLogRequested event, Emitter<HabitsState> emit) async {
    if (state is HabitsSuccess) {
      final current = state as HabitsSuccess;
      emit(current.copyWith(
        habits: current.habits.map((h) => h.id == event.habitId ? h.copyWith(completedToday: true) : h).toList(),
      ));
    }
    try {
      await _service.logToday(event.habitId, _userId);
    } catch (_) {
      add(HabitsLoadRequested());
    }
  }

  Future<void> _onDelete(HabitDeleteRequested event, Emitter<HabitsState> emit) async {
    if (state is HabitsSuccess) {
      final current = state as HabitsSuccess;
      emit(current.copyWith(habits: current.habits.where((h) => h.id != event.habitId).toList()));
    }
    try {
      await _service.delete(event.habitId);
    } catch (_) {
      add(HabitsLoadRequested());
    }
  }
}
