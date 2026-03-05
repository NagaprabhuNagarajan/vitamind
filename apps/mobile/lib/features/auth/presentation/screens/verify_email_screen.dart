import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/glass_card.dart';

/// Screen shown after registration when email verification is required.
/// Mirrors the design of [ForgotPasswordScreen] with ambient orbs, a
/// GlassCard, and gradient accents.
class VerifyEmailScreen extends StatefulWidget {
  final String email;

  const VerifyEmailScreen({super.key, required this.email});

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _fadeCtrl;
  late final Animation<double> _fadeAnim;
  bool _resending = false;
  bool _resent = false;

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
    _fadeCtrl.dispose();
    super.dispose();
  }

  Future<void> _resendEmail() async {
    if (_resending || _resent) return;
    setState(() => _resending = true);

    try {
      await Supabase.instance.client.auth.resend(
        type: OtpType.signup,
        email: widget.email,
      );
      if (!mounted) return;
      setState(() {
        _resending = false;
        _resent = true;
      });
      // Allow another resend after 60 seconds
      Future.delayed(const Duration(seconds: 60), () {
        if (mounted) setState(() => _resent = false);
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _resending = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to resend: $e'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Stack(
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
                        _buildHeader(context),
                        const SizedBox(height: 40),
                        _buildCard(context),
                        const SizedBox(height: 24),
                        _buildBackToLogin(context),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Column(
      children: [
        // Email icon with gradient background
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: const LinearGradient(
              colors: [AppColors.primary, AppColors.secondary],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.35),
                blurRadius: 24,
                spreadRadius: 0,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: const Icon(Icons.email_outlined,
              color: Colors.white, size: 30),
        ),
        const SizedBox(height: 20),
        GradientText(
          'Check your email',
          style: Theme.of(context).textTheme.displayMedium?.copyWith(
                fontWeight: FontWeight.bold,
                letterSpacing: -0.5,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'We sent a confirmation link to',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontSize: 15,
              ),
        ),
        if (widget.email.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            widget.email,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
          ),
        ],
      ],
    );
  }

  Widget _buildCard(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(24),
      color: AppColors.surface.withValues(alpha: 0.85),
      child: Column(
        children: [
          // Info text
          Text(
            'Click the link in the email to verify your account. '
            'If you do not see the email, check your spam folder.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontSize: 13,
                  height: 1.6,
                  color: AppColors.textSecondary,
                ),
          ),
          const SizedBox(height: 24),

          // Resend button
          GradientButton(
            label: _resent
                ? 'Email sent — check your inbox'
                : 'Resend confirmation email',
            loading: _resending,
            onPressed: (_resending || _resent) ? null : _resendEmail,
          ),

          if (_resent) ...[
            const SizedBox(height: 12),
            Text(
              'A new confirmation email has been sent.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontSize: 12,
                    color: AppColors.success,
                  ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBackToLogin(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.arrow_back_ios_rounded,
            size: 14, color: AppColors.textSecondary),
        TextButton(
          onPressed: () => context.go(Routes.login),
          style: TextButton.styleFrom(
            foregroundColor: AppColors.primary,
          ),
          child: const Text('Back to sign in'),
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
