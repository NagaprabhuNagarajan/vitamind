import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../../../core/widgets/offline_banner.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart' as auth_bloc;
import '../../data/dashboard_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _service = DashboardService();
  DashboardData? _data;
  bool _loading = true;
  bool _isFromCache = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final user = Supabase.instance.client.auth.currentUser!;
      final data = await _service.fetch(user.id);
      setState(() {
        _data = data;
        _isFromCache = data.isFromCache;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _showLogoutDialog(BuildContext context) async {
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
    if (confirmed == true && context.mounted) {
      context.read<auth_bloc.AuthBloc>().add(auth_bloc.AuthLogoutRequested());
    }
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  String _todayLabel() {
    final now = DateTime.now();
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return '${days[now.weekday - 1]}, ${months[now.month - 1]} ${now.day}';
  }

  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;
    final name =
        (user?.userMetadata?['full_name'] as String? ?? '')
            .split(' ')
            .firstOrNull ??
            'there';

    return Scaffold(
      backgroundColor: AppColors.bg,
      extendBodyBehindAppBar: true,
      appBar: _buildAppBar(context, name),
      body: BlocListener<auth_bloc.AuthBloc, auth_bloc.AuthState>(
        listener: (context, state) {
          if (state is auth_bloc.AuthUnauthenticated) {
            context.go(Routes.login);
          }
        },
        child: RefreshIndicator(
          onRefresh: _load,
          color: AppColors.primary,
          backgroundColor: AppColors.surface,
          child: _loading
              ? const Center(
                  child: CircularProgressIndicator(color: AppColors.primary))
              : _error != null
                  ? _buildError()
                  : _buildBody(context),
        ),
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 0),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context, String name) {
    return AppBar(
      backgroundColor: Colors.transparent,
      flexibleSpace: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppColors.bg,
              AppColors.bg.withValues(alpha: 0),
            ],
          ),
        ),
      ),
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GradientText(
            '${_greeting()}, $name',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          Text(
            _todayLabel(),
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh_outlined, size: 20),
          color: AppColors.textSecondary,
          onPressed: _load,
        ),
        IconButton(
          icon: const Icon(Icons.settings_outlined, size: 20),
          color: AppColors.textSecondary,
          onPressed: () => context.push(Routes.settings),
        ),
        IconButton(
          icon: const Icon(Icons.logout_outlined, size: 20),
          color: AppColors.textSecondary,
          onPressed: () => _showLogoutDialog(context),
        ),
      ],
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Failed to load dashboard',
              style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _load, child: const Text('Retry')),
        ],
      ),
    );
  }

  Widget _buildBody(BuildContext context) {
    final d = _data!;
    return ListView(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + kToolbarHeight + 8,
        left: 16,
        right: 16,
        bottom: 16,
      ),
      children: [
        if (_isFromCache) const OfflineBanner(),

        // Stats grid
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.55,
          children: [
            _StatCard(
              label: 'Due today',
              value: '${d.tasksDueToday}',
              icon: Icons.task_alt_outlined,
              color: AppColors.primary,
              gradientColors: [
                const Color(0xFF6366F1),
                const Color(0xFF818CF8),
              ],
            ),
            _StatCard(
              label: 'Completed',
              value: '${d.tasksCompleted}',
              icon: Icons.check_circle_outline,
              color: AppColors.success,
              gradientColors: [
                const Color(0xFF10B981),
                const Color(0xFF34D399),
              ],
            ),
            _StatCard(
              label: 'Active goals',
              value: '${d.activeGoals}',
              icon: Icons.flag_outlined,
              color: AppColors.secondary,
              gradientColors: [
                const Color(0xFFA855F7),
                const Color(0xFFC084FC),
              ],
            ),
            _StatCard(
              label: 'Habits today',
              value: '${d.habitsCheckedToday}/${d.totalHabits}',
              icon: Icons.loop_outlined,
              color: AppColors.accent,
              gradientColors: [
                const Color(0xFF06B6D4),
                const Color(0xFF22D3EE),
              ],
            ),
          ],
        ),

        const SizedBox(height: 24),

        // Quick access
        Text('Quick access',
            style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        Row(
          children: [
            _QuickCard(
              label: 'Tasks',
              icon: Icons.task_alt_outlined,
              color: AppColors.primary,
              onTap: () => context.go(Routes.tasks),
            ),
            const SizedBox(width: 10),
            _QuickCard(
              label: 'Goals',
              icon: Icons.flag_outlined,
              color: AppColors.secondary,
              onTap: () => context.go(Routes.goals),
            ),
            const SizedBox(width: 10),
            _QuickCard(
              label: 'Habits',
              icon: Icons.loop_outlined,
              color: AppColors.accent,
              onTap: () => context.go(Routes.habits),
            ),
            const SizedBox(width: 10),
            _QuickCard(
              label: 'AI',
              icon: Icons.auto_awesome_outlined,
              color: const Color(0xFFF59E0B),
              onTap: () => context.go(Routes.ai),
            ),
          ],
        ),

        if (d.latestInsight != null) ...[
          const SizedBox(height: 24),
          Text("Today's Plan",
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          GlassCard(
            borderColor: AppColors.secondary.withValues(alpha: 0.25),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppColors.secondary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.auto_awesome_outlined,
                          size: 14, color: AppColors.secondary),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'AI Daily Plan',
                      style: Theme.of(context)
                          .textTheme
                          .labelLarge
                          ?.copyWith(color: AppColors.secondary),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  d.latestInsight!.length > 300
                      ? '${d.latestInsight!.substring(0, 300)}…'
                      : d.latestInsight!,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 14),
                GestureDetector(
                  onTap: () => context.go(Routes.planner),
                  child: Row(
                    children: [
                      Text(
                        'View full plan',
                        style: Theme.of(context)
                            .textTheme
                            .labelLarge
                            ?.copyWith(color: AppColors.primary),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.arrow_forward,
                          size: 14, color: AppColors.primary),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final List<Color> gradientColors;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    required this.gradientColors,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ShaderMask(
                blendMode: BlendMode.srcIn,
                shaderCallback: (bounds) => LinearGradient(
                  colors: gradientColors,
                ).createShader(
                    Rect.fromLTWH(0, 0, bounds.width, bounds.height)),
                child: Text(
                  value,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        fontSize: 22,
                      ),
                ),
              ),
              const SizedBox(height: 2),
              Text(label,
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(fontSize: 12)),
            ],
          ),
        ],
      ),
    );
  }
}

class _QuickCard extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _QuickCard({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GlassCard(
        padding: const EdgeInsets.symmetric(vertical: 14),
        onTap: onTap,
        borderColor: color.withValues(alpha: 0.2),
        child: Column(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 6),
            Text(
              label,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    fontSize: 11,
                    color: AppColors.textSecondary,
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
