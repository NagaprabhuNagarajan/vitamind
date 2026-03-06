import 'package:mocktail/mocktail.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Mocks the Supabase client used by all services.
/// Each test file configures the mock chain it needs.
class MockSupabaseClient extends Mock implements SupabaseClient {}

/// A mock for the fluent query builder pattern used by Supabase.
/// Because Supabase uses a chained builder pattern, we mock it as
/// a single object that returns itself for each chained call.
class MockQueryBuilder extends Mock {
  // Allow any call to return this object (for chaining).
  // Unmocked methods return `this` so chained calls keep working.
  @override
  dynamic noSuchMethod(Invocation invocation) => this;
}

/// Convenience to build a mock chain for `supabase.from('table').select()...`
/// Returns the final result data when the chain terminates.
class FakeSupabaseChain {
  final dynamic resultData;
  final Object? error;

  FakeSupabaseChain(this.resultData, {this.error});
}
