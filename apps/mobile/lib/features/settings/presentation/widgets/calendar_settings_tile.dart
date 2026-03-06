import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:dio/dio.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/glass_card.dart';

/// Displays Google Calendar connection status and allows
/// connecting/disconnecting, syncing tasks, and importing events.
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
  bool _syncing = false;
  bool _importing = false;
  String? _resultMessage;

  late final Dio _dio;

  @override
  void initState() {
    super.initState();
    final base = dotenv.env['API_BASE_URL'] ?? '';
    _dio = Dio(BaseOptions(
      baseUrl: '$base/api/v1',
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
    ));
    _fetchStatus();
  }

  String get _token =>
      Supabase.instance.client.auth.currentSession?.accessToken ?? '';

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

  Future<void> _handleSync() async {
    setState(() {
      _syncing = true;
      _resultMessage = null;
    });
    try {
      final res = await _dio.post(
        '/calendar/sync',
        options: Options(headers: {'Authorization': 'Bearer $_token'}),
      );
      final data = res.data['data'];
      final message = data['message'] as String? ??
          'Synced ${data['synced']} of ${data['total']} tasks.';
      if (mounted) {
        setState(() => _resultMessage = message);
        await _fetchStatus();
      }
    } catch (e) {
      if (mounted) {
        final msg = e is DioException
            ? (e.response?.data?['error']?['message'] ?? 'Sync failed.')
            : 'Sync failed.';
        setState(() => _resultMessage = msg.toString());
      }
    } finally {
      if (mounted) setState(() => _syncing = false);
    }
  }

  Future<void> _handleImport() async {
    setState(() {
      _importing = true;
      _resultMessage = null;
    });
    try {
      final res = await _dio.post(
        '/calendar/import',
        options: Options(headers: {'Authorization': 'Bearer $_token'}),
      );
      final data = res.data['data'];
      final message = data['message'] as String? ?? 'Import complete.';
      if (mounted) {
        setState(() => _resultMessage = message);
        await _fetchStatus();
      }
    } catch (e) {
      if (mounted) {
        final msg = e is DioException
            ? (e.response?.data?['error']?['message'] ?? 'Import failed.')
            : 'Import failed.';
        setState(() => _resultMessage = msg.toString());
      }
    } finally {
      if (mounted) setState(() => _importing = false);
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

      await supabase
          .from('tasks')
          .update({'calendar_event_id': null})
          .eq('user_id', userId)
          .not('calendar_event_id', 'is', null);

      if (mounted) {
        setState(() {
          _connected = false;
          _lastSyncedAt = null;
          _resultMessage = null;
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

    if (!_connected) {
      return GlassCard(
        padding: EdgeInsets.zero,
        child: InkWell(
          onTap: _openWebSettings,
          borderRadius: BorderRadius.circular(16),
          splashColor: AppColors.primary.withValues(alpha: 0.06),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                const Icon(Icons.calendar_month_rounded,
                    size: 20, color: AppColors.textSecondary),
                const SizedBox(width: 14),
                const Expanded(
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
                      SizedBox(height: 2),
                      Text(
                        'Tap to connect via web settings',
                        style: TextStyle(
                          color: AppColors.textTertiary,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded,
                    size: 18, color: AppColors.textTertiary),
              ],
            ),
          ),
        ),
      );
    }

    // Connected state with sync/import actions
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            children: [
              const Icon(Icons.calendar_month_rounded,
                  size: 20, color: AppColors.success),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Google Calendar',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Connected \u00B7 ${_formatLastSynced(_lastSyncedAt)}',
                      style: const TextStyle(
                        color: AppColors.textTertiary,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
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
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Action buttons row
          Row(
            children: [
              Expanded(
                child: _ActionButton(
                  icon: Icons.download_rounded,
                  label: 'Import events',
                  loading: _importing,
                  onTap: _importing || _syncing ? null : _handleImport,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ActionButton(
                  icon: Icons.sync_rounded,
                  label: 'Sync tasks',
                  loading: _syncing,
                  primary: true,
                  onTap: _syncing || _importing ? null : _handleSync,
                ),
              ),
            ],
          ),

          // Result message
          if (_resultMessage != null) ...[
            const SizedBox(height: 10),
            Text(
              _resultMessage!,
              style: const TextStyle(
                color: AppColors.success,
                fontSize: 11,
              ),
            ),
          ],

          const SizedBox(height: 12),

          // Disconnect link
          GestureDetector(
            onTap: _disconnect,
            child: const Text(
              'Disconnect',
              style: TextStyle(
                color: AppColors.error,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool loading;
  final bool primary;
  final VoidCallback? onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    this.loading = false,
    this.primary = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = primary
        ? AppColors.primary.withValues(alpha: 0.15)
        : AppColors.textTertiary.withValues(alpha: 0.1);
    final borderColor = primary
        ? AppColors.primary.withValues(alpha: 0.3)
        : AppColors.textTertiary.withValues(alpha: 0.15);
    final textColor = primary ? AppColors.primary : AppColors.textSecondary;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: borderColor),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (loading)
              SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: textColor,
                ),
              )
            else
              Icon(icon, size: 14, color: textColor),
            const SizedBox(width: 6),
            Text(
              loading ? '...' : label,
              style: TextStyle(
                color: textColor,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
