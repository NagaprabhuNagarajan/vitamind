import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/glass_card.dart';
import '../bloc/auth_bloc.dart';
import '../widgets/auth_text_field.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  late AnimationController _anim;
  late Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 600));
    _fade = CurvedAnimation(parent: _anim, curve: Curves.easeOut);
    _anim.forward();
  }

  @override
  void dispose() {
    _anim.dispose();
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    context.read<AuthBloc>().add(AuthRegisterRequested(
          email: _emailController.text.trim(),
          password: _passwordController.text,
          name: _nameController.text.trim(),
        ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: BlocListener<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthAuthenticated) {
            context.go(Routes.dashboard);
          } else if (state is AuthEmailVerificationRequired) {
            // Navigate to verify-email screen with the email as a query param
            context.go(
              Uri(
                path: Routes.verifyEmail,
                queryParameters: {'email': state.email},
              ).toString(),
            );
          } else if (state is AuthError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
        child: Stack(
          children: [
            // Ambient orbs
            Positioned(
              top: -80,
              right: -60,
              child: Container(
                width: 260,
                height: 260,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(colors: [
                    AppColors.primary.withValues(alpha: 0.12),
                    Colors.transparent,
                  ]),
                ),
              ),
            ),
            Positioned(
              bottom: 100,
              left: -80,
              child: Container(
                width: 220,
                height: 220,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(colors: [
                    AppColors.secondary.withValues(alpha: 0.10),
                    Colors.transparent,
                  ]),
                ),
              ),
            ),
            // Content
            SafeArea(
              child: FadeTransition(
                opacity: _fade,
                child: Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 24, vertical: 32),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 400),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Back button
                          Align(
                            alignment: Alignment.centerLeft,
                            child: GestureDetector(
                              onTap: () => context.go(Routes.login),
                              child: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: AppColors.surfaceEl,
                                  borderRadius: BorderRadius.circular(10),
                                  border:
                                      Border.all(color: AppColors.border),
                                ),
                                child: const Icon(Icons.arrow_back,
                                    size: 18,
                                    color: AppColors.textSecondary),
                              ),
                            ),
                          ),
                          const SizedBox(height: 28),

                          // Header
                          GradientText(
                            'Create account',
                            style: Theme.of(context)
                                .textTheme
                                .headlineMedium
                                ?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Start managing your life with AI',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                          const SizedBox(height: 28),

                          // Form card
                          GlassCard(
                            padding: const EdgeInsets.all(24),
                            child: Form(
                              key: _formKey,
                              child: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.stretch,
                                children: [
                                  AuthTextField(
                                    label: 'Full name',
                                    controller: _nameController,
                                    keyboardType: TextInputType.name,
                                    prefixIcon: const Icon(
                                        Icons.person_outline,
                                        size: 20,
                                        color: AppColors.textTertiary),
                                    validator: (v) =>
                                        (v == null || v.trim().isEmpty)
                                            ? 'Name is required'
                                            : null,
                                  ),
                                  const SizedBox(height: 16),
                                  AuthTextField(
                                    label: 'Email',
                                    controller: _emailController,
                                    keyboardType:
                                        TextInputType.emailAddress,
                                    prefixIcon: const Icon(
                                        Icons.email_outlined,
                                        size: 20,
                                        color: AppColors.textTertiary),
                                    validator: (v) =>
                                        (v == null || !v.contains('@'))
                                            ? 'Enter a valid email'
                                            : null,
                                  ),
                                  const SizedBox(height: 16),
                                  AuthTextField(
                                    label: 'Password',
                                    controller: _passwordController,
                                    obscureText: true,
                                    prefixIcon: const Icon(
                                        Icons.lock_outline,
                                        size: 20,
                                        color: AppColors.textTertiary),
                                    validator: (v) =>
                                        (v == null || v.length < 6)
                                            ? 'Min 6 characters'
                                            : null,
                                  ),
                                  const SizedBox(height: 16),
                                  AuthTextField(
                                    label: 'Confirm password',
                                    controller: _confirmController,
                                    obscureText: true,
                                    textInputAction: TextInputAction.done,
                                    prefixIcon: const Icon(
                                        Icons.lock_outline,
                                        size: 20,
                                        color: AppColors.textTertiary),
                                    validator: (v) =>
                                        v != _passwordController.text
                                            ? 'Passwords do not match'
                                            : null,
                                    onFieldSubmitted: (_) => _submit(),
                                  ),
                                  const SizedBox(height: 24),
                                  BlocBuilder<AuthBloc, AuthState>(
                                    builder: (context, state) {
                                      final loading = state is AuthLoading;
                                      return GradientButton(
                                        label: 'Create account',
                                        loading: loading,
                                        onPressed:
                                            loading ? null : _submit,
                                      );
                                    },
                                  ),
                                ],
                              ),
                            ),
                          ),

                          const SizedBox(height: 24),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Already have an account?',
                                style:
                                    Theme.of(context).textTheme.bodyMedium,
                              ),
                              TextButton(
                                onPressed: () =>
                                    context.go(Routes.login),
                                child: Text(
                                  'Sign in',
                                  style: TextStyle(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
