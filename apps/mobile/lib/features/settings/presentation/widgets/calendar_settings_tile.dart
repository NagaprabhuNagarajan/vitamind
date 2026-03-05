import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/glass_card.dart';

/// Displays Google Calendar connection status and allows
/// connecting/disconnecting via the web settings page.
///
/// OAuth on mobile requires additional native setup (custom URL schemes,
/// deep links back from Google consent). To keep the MVP simple, tapping
/// "Connect" opens the web settings page where the full OAuth flow runs.
class CalendarSettingsTile extends StatefulWidget {
  const CalendarSettingsTile({super.key});

  @override
  State<CalendarSettingsTile> createState() => _CalendarSettingsTileState();
}

class _CalendarSettingsTileState extends State<CalendarSettingsTile> {
  bool _loading = true;
  bool _connected = false;
  String? _lastSyncedAt;

  @override
  void initState() {
    super.initState();
    _fetchStatus();
  }

  Future<void> _fetchStatus() async {
    try {
      final supabase = Supabase.instance.client;
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) return;

      final row = await supabase
          .from('calendar_connections')
          .select('provider, last_synced_at')
          .eq('user_id', userId)
          .eq('provider', 'google')
          .maybeSingle();

      if (mounted) {
        setState(() {
          _connected = row != null;
          _lastSyncedAt = row?['last_synced_at'] as String?;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _openWebSettings() async {
    // Open the web settings page where the full OAuth flow is available.
    // The NEXT_PUBLIC_APP_URL should match the deployed web app URL.
    const webUrl = String.fromEnvironment(
      'WEB_APP_URL',
      defaultValue: 'https://vitamind.app',
    );
    final uri = Uri.parse('$webUrl/settings');

    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open settings page.')),
        );
      }
    }
  }

  Future<void> _disconnect() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Disconnect Calendar?',
          style: TextStyle(color: AppColors.textPrimary, fontSize: 16),
        ),
        content: const Text(
          'Your tasks will no longer sync to Google Calendar.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text(
              'Disconnect',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final supabase = Supabase.instance.client;
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) return;

      await supabase
          .from('calendar_connections')
          .delete()
          .eq('user_id', userId)
          .eq('provider', 'google');

      // Clear calendar_event_id from tasks
      await supabase
          .from('tasks')
          .update({'calendar_event_id': null})
          .eq('user_id', userId)
          .not('calendar_event_id', 'is', null);

      if (mounted) {
        setState(() {
          _connected = false;
          _lastSyncedAt = null;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Calendar disconnected.')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to disconnect. Try again.')),
        );
      }
    }
  }

  String _formatLastSynced(String? iso) {
    if (iso == null) return 'Never synced';
    try {
      final date = DateTime.parse(iso);
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inMinutes < 1) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      return '${date.month}/${date.day} at ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return 'Unknown';
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return GlassCard(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            const Icon(Icons.calendar_month_rounded,
                size: 20, color: AppColors.textSecondary),
            const SizedBox(width: 14),
            const Expanded(
              child: Text(
                'Google Calendar',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.textTertiary,
              ),
            ),
          ],
        ),
      );
    }

    return GlassCard(
      padding: EdgeInsets.zero,
      child: InkWell(
        onTap: _connected ? _disconnect : _openWebSettings,
        borderRadius: BorderRadius.circular(16),
        splashColor: AppColors.primary.withValues(alpha: 0.06),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Icon(
                Icons.calendar_month_rounded,
                size: 20,
                color: _connected ? AppColors.success : AppColors.textSecondary,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Google Calendar',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _connected
                          ? 'Connected \u00B7 ${_formatLastSynced(_lastSyncedAt)}'
                          : 'Tap to connect via web settings',
                      style: const TextStyle(
                        color: AppColors.textTertiary,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              if (_connected)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.success.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'Connected',
                    style: TextStyle(
                      color: AppColors.success,
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                )
              else
                const Icon(
                  Icons.chevron_right_rounded,
                  size: 18,
                  color: AppColors.textTertiary,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
