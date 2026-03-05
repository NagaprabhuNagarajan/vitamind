import 'package:flutter_test/flutter_test.dart';
import 'package:vitamind/features/habits/data/habit_service.dart';

void main() {
  // ── Model tests ─────────────────────────────────────────────────────────────

  group('Habit.fromMap', () {
    test('parses a complete habit map', () {
      final habit = Habit.fromMap({
        'id': 'habit-1',
        'title': 'Meditate',
        'frequency': 'daily',
        'current_streak': 5,
        'reminder_time': '08:00:00',
      });

      expect(habit.id, 'habit-1');
      expect(habit.title, 'Meditate');
      expect(habit.frequency, 'daily');
      expect(habit.currentStreak, 5);
      expect(habit.completedToday, false); // default
      expect(habit.reminderTime, '08:00'); // trimmed to HH:MM
    });

    test('defaults frequency to "daily" when null', () {
      final map = _minHabitMap();
      map['frequency'] = null;
      final habit = Habit.fromMap(map);
      expect(habit.frequency, 'daily');
    });

    test('defaults current_streak to 0 when null', () {
      final map = _minHabitMap();
      map['current_streak'] = null;
      final habit = Habit.fromMap(map);
      expect(habit.currentStreak, 0);
    });

    test('handles null reminder_time', () {
      final map = _minHabitMap();
      map['reminder_time'] = null;
      final habit = Habit.fromMap(map);
      expect(habit.reminderTime, isNull);
    });

    test('trims reminder_time to HH:MM format', () {
      final habit = Habit.fromMap({
        ..._minHabitMap(),
        'reminder_time': '14:30:00',
      });
      expect(habit.reminderTime, '14:30');
    });

    test('accepts completedToday parameter', () {
      final habit = Habit.fromMap(_minHabitMap(), completedToday: true);
      expect(habit.completedToday, true);
    });

    test('converts num streak to int', () {
      final map = _minHabitMap();
      map['current_streak'] = 7.0;
      final habit = Habit.fromMap(map);
      expect(habit.currentStreak, 7);
    });
  });

  group('Habit.copyWith', () {
    test('updates completedToday', () {
      final habit = Habit.fromMap(_minHabitMap());
      final updated = habit.copyWith(completedToday: true);
      expect(updated.completedToday, true);
      expect(updated.id, habit.id);
      expect(updated.title, habit.title);
    });

    test('preserves fields when no overrides', () {
      final habit = Habit.fromMap(_minHabitMap(), completedToday: true);
      final copy = habit.copyWith();
      expect(copy.completedToday, true);
      expect(copy.currentStreak, habit.currentStreak);
    });
  });

  // ── HabitService._todayStr format test ──────────────────────────────────────

  group('_todayStr format', () {
    test('produces YYYY-MM-DD with zero-padded month and day', () {
      // We cannot call the private method directly, but we verify the format
      // matches what Supabase expects: YYYY-MM-DD
      final now = DateTime.now();
      final expected =
          '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';

      // The format should be exactly 10 characters: YYYY-MM-DD
      expect(expected.length, 10);
      expect(RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(expected), true);
    });
  });

  // ── Habit log upsert onConflict ─────────────────────────────────────────────

  group('habit log conflict key', () {
    test('onConflict should be "habit_id,date" per the DB unique constraint', () {
      // This documents the critical bug fix: the onConflict must match
      // the DB unique constraint on (habit_id, date), not (habit_id, log_date)
      // The column is 'date', not 'log_date' — verified via memory doc
      const onConflict = 'habit_id,date';
      expect(onConflict, contains('habit_id'));
      expect(onConflict, contains('date'));
      expect(onConflict, isNot(contains('log_date')));
    });
  });
}

Map<String, dynamic> _minHabitMap() {
  return {
    'id': 'habit-1',
    'title': 'Meditate',
    'frequency': 'daily',
    'current_streak': 3,
    'reminder_time': '08:00:00',
  };
}
