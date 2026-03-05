import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/glass_card.dart';
import '../bloc/auth_bloc.dart';
import '../widgets/auth_text_field.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  late final AnimationController _fadeCtrl;
  late final Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..forward();
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _fadeCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    context.read<AuthBloc>().add(AuthLoginRequested(
          email: _emailController.text.trim(),
          password: _passwordController.text,
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
          } else if (state is AuthError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error,
              ),
            );
          }
        },
        child: Stack(
          children: [
            // Ambient orbs
            Positioned(
              top: -100,
              right: -80,
              child: _AmbientOrb(
                color: AppColors.primary.withValues(alpha: 0.25),
                size: 300,
              ),
            ),
            Positioned(
              bottom: -80,
              left: -60,
              child: _AmbientOrb(
                color: AppColors.secondary.withValues(alpha: 0.18),
                size: 250,
              ),
            ),

            // Content
            SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 400),
                    child: FadeTransition(
                      opacity: _fadeAnim,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Logo + branding
                          _buildHeader(context),
                          const SizedBox(height: 40),

                          // Card
                          GlassCard(
                            padding: const EdgeInsets.all(24),
                            color: AppColors.surface.withValues(alpha: 0.85),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                // Google Sign-In
                                BlocBuilder<AuthBloc, AuthState>(
                                  builder: (context, state) {
                                    final loading = state is AuthLoading;
                                    return _GoogleButton(
                                      loading: loading,
                                      onTap: loading
                                          ? null
                                          : () => context
                                              .read<AuthBloc>()
                                              .add(AuthGoogleLoginRequested()),
                                    );
                                  },
                                ),

                                const SizedBox(height: 24),
                                _Divider(),
                                const SizedBox(height: 24),

                                // Email + Password
                                Form(
                                  key: _formKey,
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.stretch,
                                    children: [
                                      AuthTextField(
                                        label: 'Email',
                                        controller: _emailController,
                                        keyboardType:
                                            TextInputType.emailAddress,
                                        prefixIcon: const Icon(
                                            Icons.email_outlined,
                                            size: 20,
                                            color: AppColors.textSecondary),
                                        validator: (v) =>
                                            (v == null || !v.contains('@'))
                                                ? 'Enter a valid email'
                                                : null,
                                      ),
                                      const SizedBox(height: 14),
                                      AuthTextField(
                                        label: 'Password',
                                        controller: _passwordController,
                                        obscureText: true,
                                        textInputAction: TextInputAction.done,
                                        prefixIcon: const Icon(
                                            Icons.lock_outline,
                                            size: 20,
                                            color: AppColors.textSecondary),
                                        validator: (v) =>
                                            (v == null || v.length < 6)
                                                ? 'Min 6 characters'
                                                : null,
                                        onFieldSubmitted: (_) => _submit(),
                                      ),
                                      const SizedBox(height: 8),
                                      Align(
                                        alignment: Alignment.centerRight,
                                        child: TextButton(
                                          onPressed: () => context
                                              .go(Routes.forgotPassword),
                                          style: TextButton.styleFrom(
                                            foregroundColor:
                                                AppColors.textSecondary,
                                            padding: const EdgeInsets
                                                .symmetric(
                                                horizontal: 4,
                                                vertical: 2),
                                            minimumSize: Size.zero,
                                            tapTargetSize:
                                                MaterialTapTargetSize
                                                    .shrinkWrap,
                                          ),
                                          child: const Text(
                                            'Forgot password?',
                                            style: TextStyle(fontSize: 13),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: 16),
                                      BlocBuilder<AuthBloc, AuthState>(
                                        builder: (context, state) {
                                          final loading = state is AuthLoading;
                                          return GradientButton(
                                            label: 'Sign in',
                                            loading: loading,
                                            onPressed: loading ? null : _submit,
                                          );
                                        },
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 24),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                "Don't have an account?",
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                              TextButton(
                                onPressed: () => context.go(Routes.register),
                                style: TextButton.styleFrom(
                                  foregroundColor: AppColors.primary,
                                ),
                                child: const Text('Sign up'),
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

  Widget _buildHeader(BuildContext context) {
    return Column(
      children: [
        // Logo with glow
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.45),
                blurRadius: 28,
                spreadRadius: 0,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: Image.asset(
              'assets/logo.png',
              width: 72,
              height: 72,
              errorBuilder: (_, __, ___) => Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.primary, AppColors.secondary],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Icon(Icons.bolt_rounded,
                    color: Colors.white, size: 36),
              ),
            ),
          ),
        ),
        const SizedBox(height: 20),
        GradientText(
          'VitaMind',
          style: Theme.of(context).textTheme.displayMedium?.copyWith(
                fontWeight: FontWeight.bold,
                letterSpacing: -0.5,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'Intelligence for your life',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontSize: 15,
              ),
        ),
      ],
    );
  }
}

class _AmbientOrb extends StatelessWidget {
  final Color color;
  final double size;
  const _AmbientOrb({required this.color, required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [color, Colors.transparent],
          stops: const [0, 1],
        ),
      ),
    );
  }
}

class _GoogleButton extends StatelessWidget {
  final bool loading;
  final VoidCallback? onTap;
  const _GoogleButton({required this.loading, this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 50,
      child: OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: AppColors.borderBright),
          backgroundColor: AppColors.surfaceEl,
          foregroundColor: AppColors.textPrimary,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (loading)
              const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                    color: AppColors.primary, strokeWidth: 2),
              )
            else
              SvgPicture.string(_googleLogoSvg, width: 18, height: 18),
            const SizedBox(width: 10),
            const Text(
              'Continue with Google',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Expanded(child: Divider(color: AppColors.border)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Text(
            'or',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
        const Expanded(child: Divider(color: AppColors.border)),
      ],
    );
  }
}

// Inline Google SVG logo
const _googleLogoSvg = '''
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
</svg>
''';
