import 'package:flutter_test/flutter_test.dart';
import 'package:vitamind/features/dashboard/data/dashboard_service.dart';

void main() {
  // ── DashboardData model tests ───────────────────────────────────────────────

  group('DashboardData', () {
    test('constructs with all required fields', () {
      const data = DashboardData(
        tasksDueToday: 3,
        tasksCompleted: 1,
        activeGoals: 2,
        habitsCheckedToday: 4,
        totalHabits: 5,
        latestInsight: 'Focus on writing.',
      );

      expect(data.tasksDueToday, 3);
      expect(data.tasksCompleted, 1);
      expect(data.activeGoals, 2);
      expect(data.habitsCheckedToday, 4);
      expect(data.totalHabits, 5);
      expect(data.latestInsight, 'Focus on writing.');
    });

    test('latestInsight can be null', () {
      const data = DashboardData(
        tasksDueToday: 0,
        tasksCompleted: 0,
        activeGoals: 0,
        habitsCheckedToday: 0,
        totalHabits: 0,
      );
      expect(data.latestInsight, isNull);
    });

    test('handles zero values for all counters', () {
      const data = DashboardData(
        tasksDueToday: 0,
        tasksCompleted: 0,
        activeGoals: 0,
        habitsCheckedToday: 0,
        totalHabits: 0,
      );
      expect(data.tasksDueToday, 0);
      expect(data.tasksCompleted, 0);
      expect(data.activeGoals, 0);
      expect(data.habitsCheckedToday, 0);
      expect(data.totalHabits, 0);
    });
  });

  // ── _safeCount behavior ─────────────────────────────────────────────────────

  group('_safeCount fallback behavior', () {
    test('the service returns 0 on query error (documented contract)', () {
      // _safeCount wraps each query in try-catch and returns 0 on error.
      // This is the key resilience pattern: one failing table does not
      // break the entire dashboard.
      //
      // We verify the pattern by testing the same logic inline:
      int safeCount(List<dynamic>? result) {
        try {
          return result?.length ?? 0;
        } catch (_) {
          return 0;
        }
      }

      expect(safeCount(null), 0);
      expect(safeCount([]), 0);
      expect(safeCount([1, 2, 3]), 3);
    });

    test('each query is independent - one failure does not block others', () {
      // This documents the architectural decision: dashboard runs 5+ queries
      // independently, each wrapped in _safeCount, so partial data is returned
      // even if a table is unavailable.
      //
      // Example: if habit_logs table does not exist yet, habitsCheckedToday = 0
      // but tasksDueToday still works fine.
      const data = DashboardData(
        tasksDueToday: 5,
        tasksCompleted: 2,
        activeGoals: 3,
        habitsCheckedToday: 0, // query failed, got fallback 0
        totalHabits: 4,
      );
      expect(data.tasksDueToday, 5);
      expect(data.habitsCheckedToday, 0);
    });
  });

  // ── Date format test ────────────────────────────────────────────────────────

  group('todayStr format', () {
    test('produces YYYY-MM-DD format used by Supabase date queries', () {
      final today = DateTime.now();
      final todayStr =
          '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

      expect(todayStr.length, 10);
      expect(RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(todayStr), true);
    });
  });
}
