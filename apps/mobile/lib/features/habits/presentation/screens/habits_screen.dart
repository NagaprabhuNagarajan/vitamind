import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/habit_service.dart';
import '../bloc/habits_bloc.dart';

class HabitsScreen extends StatelessWidget {
  const HabitsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final userId = Supabase.instance.client.auth.currentUser!.id;
    return BlocProvider(
      create: (_) =>
          HabitsBloc(HabitService(), userId)..add(HabitsLoadRequested()),
      child: const _HabitsView(),
    );
  }
}

class _HabitsView extends StatelessWidget {
  const _HabitsView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Habits'),
        leading: BackButton(
          color: AppColors.textSecondary,
          onPressed: () => context.go(Routes.dashboard),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            child: IconButton(
              icon: const Icon(Icons.add_rounded),
              color: AppColors.accent,
              style: IconButton.styleFrom(
                backgroundColor: AppColors.accent.withValues(alpha: 0.12),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () => _showCreateDialog(context),
            ),
          ),
        ],
      ),
      body: BlocBuilder<HabitsBloc, HabitsState>(
        builder: (context, state) {
          if (state is HabitsLoading || state is HabitsInitial) {
            return const Center(
                child: CircularProgressIndicator(color: AppColors.accent));
          }
          if (state is HabitsError) {
            return Center(
                child: Text(state.message,
                    style: Theme.of(context).textTheme.bodyLarge));
          }
          if (state is HabitsSuccess) {
            final done =
                state.habits.where((h) => h.completedToday).length;
            if (state.habits.isEmpty) {
              return Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.loop_outlined,
                        size: 48, color: AppColors.textTertiary),
                    const SizedBox(height: 16),
                    Text('No habits yet. Tap + to create one.',
                        style: Theme.of(context).textTheme.bodyMedium),
                  ],
                ),
              );
            }
            return RefreshIndicator(
              onRefresh: () async =>
                  context.read<HabitsBloc>().add(HabitsLoadRequested()),
              color: AppColors.accent,
              backgroundColor: AppColors.surface,
              child: Column(
                children: [
                  _ProgressHeader(done: done, total: state.habits.length),
                  Expanded(
                    child: GridView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 1.05,
                      ),
                      itemCount: state.habits.length,
                      itemBuilder: (ctx, i) =>
                          _HabitCard(habit: state.habits[i]),
                    ),
                  ),
                ],
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 2),
    );
  }

  void _showCreateDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (sheetCtx) => BlocProvider.value(
        value: context.read<HabitsBloc>(),
        child: const _CreateHabitSheet(),
      ),
    );
  }
}

class _ProgressHeader extends StatelessWidget {
  final int done;
  final int total;
  const _ProgressHeader({required this.done, required this.total});

  @override
  Widget build(BuildContext context) {
    final pct = total == 0 ? 0.0 : done / total;
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.accent.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.accent.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(5),
                    decoration: BoxDecoration(
                      color: AppColors.accent.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Icon(Icons.loop_outlined,
                        size: 14, color: AppColors.accent),
                  ),
                  const SizedBox(width: 8),
                  Text("Today's progress",
                      style: Theme.of(context).textTheme.labelLarge),
                ],
              ),
              ShaderMask(
                blendMode: BlendMode.srcIn,
                shaderCallback: (bounds) => const LinearGradient(
                  colors: [Color(0xFF06B6D4), Color(0xFF22D3EE)],
                ).createShader(
                    Rect.fromLTWH(0, 0, bounds.width, bounds.height)),
                child: Text(
                  '$done / $total',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: pct,
              minHeight: 6,
              backgroundColor: AppColors.border,
              valueColor: const AlwaysStoppedAnimation(AppColors.accent),
            ),
          ),
        ],
      ),
    );
  }
}

class _HabitCard extends StatelessWidget {
  final Habit habit;
  const _HabitCard({required this.habit});

  Future<void> _onTap(BuildContext context) async {
    if (habit.completedToday) return;

    final confirmed = await showDialog<bool>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.6),
      builder: (ctx) => Dialog(
        backgroundColor: AppColors.surface,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.accent.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.loop_outlined,
                    color: AppColors.accent, size: 28),
              ),
              const SizedBox(height: 16),
              Text('Mark as done?',
                  style: Theme.of(ctx).textTheme.titleMedium,
                  textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(
                'Log "${habit.title}" as completed today?',
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
                        backgroundColor: AppColors.accent,
                      ),
                      child: const Text('Mark done'),
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
      context.read<HabitsBloc>().add(HabitLogRequested(habit.id));
    }
  }

  Future<void> _onDelete(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.6),
      builder: (ctx) => Dialog(
        backgroundColor: AppColors.surface,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
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
                ),
                child: const Icon(Icons.delete_outline_rounded,
                    color: AppColors.error, size: 28),
              ),
              const SizedBox(height: 16),
              Text('Delete habit?',
                  style: Theme.of(ctx).textTheme.titleMedium,
                  textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(
                '"${habit.title}" and all its history will be removed.',
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
                      child: const Text('Delete'),
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
      context.read<HabitsBloc>().add(HabitDeleteRequested(habit.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final done = habit.completedToday;
    return GlassCard(
      padding: const EdgeInsets.all(14),
      onTap: () => _onTap(context),
      color: done
          ? AppColors.accent.withValues(alpha: 0.06)
          : AppColors.surface,
      borderColor: done
          ? AppColors.accent.withValues(alpha: 0.3)
          : AppColors.border,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 26,
                height: 26,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: done
                      ? AppColors.accent.withValues(alpha: 0.15)
                      : Colors.transparent,
                  border: done
                      ? null
                      : Border.all(
                          color: AppColors.secondary.withValues(alpha: 0.5),
                          width: 1.5,
                        ),
                ),
                child: done
                    ? const Icon(Icons.check,
                        size: 14, color: AppColors.accent)
                    : null,
              ),
              GestureDetector(
                onTap: () => _onDelete(context),
                child: Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(5),
                    color: AppColors.error.withValues(alpha: 0.08),
                  ),
                  child: const Icon(Icons.close,
                      size: 12, color: AppColors.textTertiary),
                ),
              ),
            ],
          ),
          const Spacer(),
          Text(
            habit.title,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  decoration: done ? TextDecoration.lineThrough : null,
                  decorationColor: AppColors.textTertiary,
                  color:
                      done ? AppColors.textTertiary : AppColors.textPrimary,
                  fontSize: 14,
                ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Text('🔥', style: TextStyle(fontSize: 12)),
              const SizedBox(width: 4),
              Text(
                '${habit.currentStreak} day streak',
                style: const TextStyle(
                    fontSize: 11, color: AppColors.textTertiary),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CreateHabitSheet extends StatefulWidget {
  const _CreateHabitSheet();

  @override
  State<_CreateHabitSheet> createState() => _CreateHabitSheetState();
}

class _CreateHabitSheetState extends State<_CreateHabitSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  String _frequency = 'daily';
  TimeOfDay? _reminderTime;

  @override
  void dispose() {
    _titleCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _reminderTime ?? TimeOfDay.now(),
    );
    if (picked != null) setState(() => _reminderTime = picked);
  }

  String? _reminderTimeStr() {
    if (_reminderTime == null) return null;
    final h = _reminderTime!.hour.toString().padLeft(2, '0');
    final m = _reminderTime!.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    context.read<HabitsBloc>().add(HabitCreateRequested(
          title: _titleCtrl.text.trim(),
          frequency: _frequency,
          reminderTime: _reminderTimeStr(),
        ));
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      padding: EdgeInsets.fromLTRB(
          24, 20, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text('New habit',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            TextFormField(
              controller: _titleCtrl,
              autofocus: true,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(labelText: 'Habit name'),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _frequency,
                    dropdownColor: AppColors.surfaceEl,
                    style: const TextStyle(color: AppColors.textPrimary),
                    decoration: const InputDecoration(labelText: 'Frequency'),
                    items: const [
                      DropdownMenuItem(value: 'daily', child: Text('Daily')),
                      DropdownMenuItem(value: 'weekly', child: Text('Weekly')),
                      DropdownMenuItem(value: 'weekdays', child: Text('Weekdays')),
                      DropdownMenuItem(value: 'weekends', child: Text('Weekends')),
                    ],
                    onChanged: (v) => setState(() => _frequency = v!),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickTime,
                    icon: Icon(
                      Icons.notifications_outlined,
                      size: 16,
                      color: _reminderTime != null
                          ? AppColors.accent
                          : AppColors.textSecondary,
                    ),
                    label: Text(
                      _reminderTime != null
                          ? _reminderTime!.format(context)
                          : 'Reminder',
                      style: TextStyle(
                        color: _reminderTime != null
                            ? AppColors.accent
                            : AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            ElevatedButton(
                onPressed: _submit,
                child: const Text('Create habit')),
          ],
        ),
      ),
    );
  }
}
