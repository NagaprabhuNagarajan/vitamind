import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService {
  final _supabase = Supabase.instance.client;

  // ─── Current user ─────────────────────────────────────────────────────────

  User? get currentUser => _supabase.auth.currentUser;
  Session? get currentSession => _supabase.auth.currentSession;
  bool get isAuthenticated => currentUser != null;

  // Stream for reactive auth state changes
  Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;

  // ─── Email + Password ─────────────────────────────────────────────────────

  Future<AuthResponse> register({
    required String email,
    required String password,
    required String name,
  }) async {
    return await _supabase.auth.signUp(
      email: email,
      password: password,
      data: {'full_name': name},
    );
  }

  Future<AuthResponse> login({
    required String email,
    required String password,
  }) async {
    return await _supabase.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────

  Future<bool> loginWithGoogle() async {
    return await _supabase.auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: 'vitamind://auth/callback',
      authScreenLaunchMode: LaunchMode.externalApplication,
    );
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  Future<void> logout() async {
    await _supabase.auth.signOut();
  }

  // ─── Password reset ───────────────────────────────────────────────────────

  Future<void> sendPasswordReset(String email) async {
    await _supabase.auth.resetPasswordForEmail(email);
  }

  // ─── Account deletion ──────────────────────────────────────────────────────
  // Deletes the user's profile row (CASCADE removes tasks/goals/habits/etc.)
  // then signs out.  The auth.users row must be deleted server-side via admin
  // API — the mobile client only cleans up the data it can access via RLS.

  Future<void> deleteAccount() async {
    final userId = currentUser?.id;
    if (userId == null) return;

    await _supabase.from('users').delete().eq('id', userId);
    await _supabase.auth.signOut();
  }
}
