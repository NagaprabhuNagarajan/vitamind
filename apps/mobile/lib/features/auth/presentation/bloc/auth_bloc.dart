import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/auth_service.dart';

// ─── Events ───────────────────────────────────────────────────────────────────

abstract class AuthEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class AuthStarted extends AuthEvent {}

class AuthLoginRequested extends AuthEvent {
  final String email;
  final String password;
  AuthLoginRequested({required this.email, required this.password});
  @override
  List<Object?> get props => [email, password];
}

class AuthRegisterRequested extends AuthEvent {
  final String email;
  final String password;
  final String name;
  AuthRegisterRequested({required this.email, required this.password, required this.name});
  @override
  List<Object?> get props => [email, password, name];
}

class AuthGoogleLoginRequested extends AuthEvent {}

class AuthLogoutRequested extends AuthEvent {}

class AuthDeleteAccountRequested extends AuthEvent {}

class AuthPasswordResetRequested extends AuthEvent {
  final String email;
  AuthPasswordResetRequested({required this.email});
  @override
  List<Object?> get props => [email];
}

class _AuthStateChanged extends AuthEvent {
  final Session? session;
  _AuthStateChanged(this.session);
}

// ─── States ───────────────────────────────────────────────────────────────────

abstract class AuthState extends Equatable {
  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {}
class AuthLoading extends AuthState {}

class AuthAuthenticated extends AuthState {
  final User user;
  AuthAuthenticated(this.user);
  @override
  List<Object?> get props => [user];
}

class AuthUnauthenticated extends AuthState {}

class AuthPasswordResetSent extends AuthState {}

/// Emitted when registration succeeds but email confirmation is required.
class AuthEmailVerificationRequired extends AuthState {
  final String email;
  AuthEmailVerificationRequired(this.email);
  @override
  List<Object?> get props => [email];
}

class AuthError extends AuthState {
  final String message;
  AuthError(this.message);
  @override
  List<Object?> get props => [message];
}

// ─── Bloc ─────────────────────────────────────────────────────────────────────

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthService _authService;
  late final StreamSubscription<dynamic> _authSub;

  AuthBloc(this._authService) : super(AuthInitial()) {
    on<AuthStarted>(_onStarted);
    on<AuthLoginRequested>(_onLogin);
    on<AuthRegisterRequested>(_onRegister);
    on<AuthGoogleLoginRequested>(_onGoogleLogin);
    on<AuthLogoutRequested>(_onLogout);
    on<AuthPasswordResetRequested>(_onPasswordReset);
    on<AuthDeleteAccountRequested>(_onDeleteAccount);
    on<_AuthStateChanged>(_onAuthStateChanged);

    // Subscribe to Supabase auth state changes and forward as bloc events
    _authSub = _authService.authStateChanges.listen((data) {
      add(_AuthStateChanged(data.session));
    });
  }

  void _onStarted(AuthStarted event, Emitter<AuthState> emit) {
    final user = _authService.currentUser;
    if (user != null) {
      emit(AuthAuthenticated(user));
    } else {
      emit(AuthUnauthenticated());
    }
  }

  void _onAuthStateChanged(_AuthStateChanged event, Emitter<AuthState> emit) {
    final session = event.session;
    if (session != null) {
      emit(AuthAuthenticated(session.user));
    } else {
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onLogin(AuthLoginRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final response = await _authService.login(
        email: event.email,
        password: event.password,
      );
      if (response.user != null) {
        emit(AuthAuthenticated(response.user!));
      } else {
        emit(AuthError('Login failed. Please try again.'));
      }
    } on AuthException catch (e) {
      emit(AuthError(e.message));
    } catch (_) {
      emit(AuthError('An unexpected error occurred.'));
    }
  }

  Future<void> _onRegister(AuthRegisterRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final response = await _authService.register(
        email: event.email,
        password: event.password,
        name: event.name,
      );
      if (response.user != null && response.user!.emailConfirmedAt != null) {
        emit(AuthAuthenticated(response.user!));
      } else {
        // Email confirmation required — pass the email so the UI can show it
        emit(AuthEmailVerificationRequired(event.email));
      }
    } on AuthException catch (e) {
      emit(AuthError(e.message));
    } catch (_) {
      emit(AuthError('Registration failed. Please try again.'));
    }
  }

  Future<void> _onGoogleLogin(AuthGoogleLoginRequested event, Emitter<AuthState> emit) async {
    // Don't emit AuthLoading here — it blocks the auth state listener from
    // updating the state after the OAuth redirect returns. The browser opens
    // and signInWithOAuth returns immediately; Supabase fires onAuthStateChange
    // when the deep-link callback is processed, which updates the state via
    // _AuthStateChanged.
    try {
      await _authService.loginWithGoogle();
    } on AuthException catch (e) {
      emit(AuthError(e.message));
    } catch (e) {
      emit(AuthError('Google sign-in failed: $e'));
    }
  }

  Future<void> _onPasswordReset(
      AuthPasswordResetRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await _authService.sendPasswordReset(event.email);
      emit(AuthPasswordResetSent());
    } on AuthException catch (e) {
      emit(AuthError(e.message));
    } catch (_) {
      emit(AuthError('Failed to send reset email. Please try again.'));
    }
  }

  Future<void> _onDeleteAccount(
      AuthDeleteAccountRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await _authService.deleteAccount();
      emit(AuthUnauthenticated());
    } catch (_) {
      emit(AuthError('Failed to delete account. Please try again.'));
    }
  }

  Future<void> _onLogout(AuthLogoutRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    await _authService.logout();
    emit(AuthUnauthenticated());
  }

  @override
  Future<void> close() {
    _authSub.cancel();
    return super.close();
  }
}
