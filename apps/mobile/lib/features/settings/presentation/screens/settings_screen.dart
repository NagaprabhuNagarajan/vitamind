import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../../../core/router/app_router.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../widgets/settings_tile.dart';
import '../widgets/delete_confirmation_sheet.dart';
import '../widgets/profile_card.dart';
import '../widgets/calendar_settings_tile.dart';
import '../widgets/notification_toggle.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _nameController = TextEditingController();
  bool _saving = false;
  String? _statusMessage;
  bool _isError = false;

  String _email = '';
  String? _avatarUrl;
  String _originalName = '';

  // Notification preferences
  bool _weeklyReport = true;
  bool _dailyReminder = false;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  Future<void> _loadProfile() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    setState(() {
      _email = user.email ?? '';
      _avatarUrl = user.userMetadata?['avatar_url'] as String?;
    });

    try {
      final row = await Supabase.instance.client
          .from('users')
          .select('name, avatar_url, email_weekly_report, email_daily_reminder')
          .eq('id', user.id)
          .maybeSingle();

      final name = (row?['name'] as String?) ??
          (user.userMetadata?['full_name'] as String?) ??
          '';

      if (mounted) {
        setState(() {
          _originalName = name;
          _nameController.text = name;
          _avatarUrl = (row?['avatar_url'] as String?) ?? _avatarUrl;
          _weeklyReport = (row?['email_weekly_report'] as bool?) ?? true;
          _dailyReminder = (row?['email_daily_reminder'] as bool?) ?? false;
        });
      }
    } catch (_) {
      final name = (user.userMetadata?['full_name'] as String?) ?? '';
      if (mounted) {
        setState(() { _originalName = name; _nameController.text = name; });
      }
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  Future<void> _saveProfile() async {
    final name = _nameController.text.trim();
    if (name.isEmpty || name == _originalName) return;

    setState(() { _saving = true; _statusMessage = null; });

    try {
      final userId = Supabase.instance.client.auth.currentUser!.id;
      await Supabase.instance.client
          .from('users')
          .update({'name': name})
          .eq('id', userId);

      if (mounted) {
        setState(() {
          _originalName = name;
          _saving = false;
          _statusMessage = 'Profile updated.';
          _isError = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _saving = false;
          _statusMessage = 'Failed to save. Please try again.';
          _isError = true;
        });
      }
    }
  }

  /// Persists a single notification preference toggle to the database.
  Future<void> _updateNotificationPref(String field, bool value) async {
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) return;

    try {
      await Supabase.instance.client
          .from('users')
          .update({field: value})
          .eq('id', userId);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update preference.')),
        );
      }
    }
  }

  Future<void> _sendPasswordReset() async {
    if (_email.isEmpty) return;
    try {
      await Supabase.instance.client.auth.resetPasswordForEmail(_email);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Password reset email sent.')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to send reset email.')),
        );
      }
    }
  }

  Future<void> _showLogoutDialog() async {
    final confirmed = await showDialog<bool>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.7),
      builder: (ctx) => Dialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.error.withValues(alpha: 0.25)),
                ),
                child: const Icon(Icons.logout_outlined,
                    color: AppColors.error, size: 28),
              ),
              const SizedBox(height: 16),
              Text('Sign out?',
                  style: Theme.of(ctx).textTheme.titleMedium,
                  textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(
                "You'll need to sign in again to access your account.",
                style: Theme.of(ctx).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(ctx, true),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.error,
                      ),
                      child: const Text('Sign out'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
    if (confirmed == true && mounted) {
      context.read<AuthBloc>().add(AuthLogoutRequested());
    }
  }

  void _confirmDeleteAccount() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DeleteConfirmationSheet(onConfirm: _deleteAccount),
    );
  }

  Future<void> _deleteAccount() async {
    try {
      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId == null) return;
      await Supabase.instance.client.from('users').delete().eq('id', userId);
      if (mounted) {
        Navigator.of(context).pop();
        context.read<AuthBloc>().add(AuthLogoutRequested());
        context.go(Routes.login);
      }
    } catch (_) {
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to delete account.')),
        );
      }
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final hasChanges = _nameController.text.trim() != _originalName &&
        _nameController.text.trim().isNotEmpty;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
        children: [
          // Profile
          const SettingsSectionHeader(
            icon: Icons.person_outline_rounded,
            title: 'Profile',
            color: AppColors.primary,
          ),
          const SizedBox(height: 12),
          ProfileCard(
            email: _email,
            avatarUrl: _avatarUrl,
            originalName: _originalName,
            nameController: _nameController,
            saving: _saving,
            statusMessage: _statusMessage,
            isError: _isError,
            hasChanges: hasChanges,
            onSave: _saveProfile,
            onChanged: () => setState(() {}),
          ),

          const SizedBox(height: 28),

          // Notifications
          const SettingsSectionHeader(
            icon: Icons.notifications_outlined,
            title: 'Notifications',
            color: AppColors.secondary,
          ),
          const SizedBox(height: 12),
          GlassCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                NotificationToggle(
                  icon: Icons.mail_outline_rounded,
                  title: 'Weekly productivity report',
                  subtitle: 'Summary of tasks, habits, and goals every Sunday',
                  value: _weeklyReport,
                  onChanged: (val) {
                    setState(() => _weeklyReport = val);
                    _updateNotificationPref('email_weekly_report', val);
                  },
                ),
                const Divider(height: 1, color: AppColors.border),
                NotificationToggle(
                  icon: Icons.wb_sunny_outlined,
                  title: 'Daily task reminder',
                  subtitle: 'Morning email with your priorities for the day',
                  value: _dailyReminder,
                  onChanged: (val) {
                    setState(() => _dailyReminder = val);
                    _updateNotificationPref('email_daily_reminder', val);
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: 28),

          // Calendar Integration
          const SettingsSectionHeader(
            icon: Icons.calendar_month_rounded,
            title: 'Integrations',
            color: AppColors.primary,
          ),
          const SizedBox(height: 12),
          const CalendarSettingsTile(),

          const SizedBox(height: 28),

          // Account
          const SettingsSectionHeader(
            icon: Icons.shield_outlined,
            title: 'Account',
            color: AppColors.accent,
          ),
          const SizedBox(height: 12),
          GlassCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                SettingsTile(
                  icon: Icons.lock_outline_rounded,
                  title: 'Change password',
                  subtitle: 'Send a password reset link',
                  onTap: _sendPasswordReset,
                ),
                const Divider(height: 1, color: AppColors.border),
                SettingsTile(
                  icon: Icons.logout_rounded,
                  title: 'Sign out',
                  subtitle: 'Sign out of your account',
                  onTap: _showLogoutDialog,
                ),
              ],
            ),
          ),

          const SizedBox(height: 28),

          // Danger zone
          const SettingsSectionHeader(
            icon: Icons.warning_amber_rounded,
            title: 'Danger Zone',
            color: AppColors.error,
          ),
          const SizedBox(height: 12),
          GlassCard(
            borderColor: AppColors.error.withValues(alpha: 0.2),
            padding: EdgeInsets.zero,
            child: SettingsTile(
              icon: Icons.delete_forever_rounded,
              iconColor: AppColors.error,
              title: 'Delete account',
              titleColor: AppColors.error,
              subtitle: 'Permanently delete all your data',
              onTap: _confirmDeleteAccount,
            ),
          ),
        ],
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }
}
