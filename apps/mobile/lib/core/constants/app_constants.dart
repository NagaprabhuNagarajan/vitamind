class AppConstants {
  // API
  static const String apiVersion = 'v1';
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://vitamind-ai.vercel.app',
  );

  // Supabase table names
  static const String usersTable = 'users';
  static const String tasksTable = 'tasks';
  static const String goalsTable = 'goals';
  static const String habitsTable = 'habits';
  static const String habitLogsTable = 'habit_logs';
  static const String aiInsightsTable = 'ai_insights';

  // Cache durations
  static const Duration dailyPlanCacheDuration = Duration(hours: 12);
  static const Duration insightsCacheDuration = Duration(hours: 6);

  // Pagination
  static const int defaultPageSize = 20;

  // UI
  static const double borderRadius = 8.0;
  static const double cardRadius = 12.0;
  static const double gridUnit = 8.0;
}
