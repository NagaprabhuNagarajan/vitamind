import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/goal_service.dart';
import '../bloc/goals_bloc.dart';

class GoalsScreen extends StatelessWidget {
  const GoalsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final userId = Supabase.instance.client.auth.currentUser!.id;
    return BlocProvider(
      create: (_) =>
          GoalsBloc(GoalService(), userId)..add(GoalsLoadRequested()),
      child: const _GoalsView(),
    );
  }
}

class _GoalsView extends StatefulWidget {
  const _GoalsView();

  @override
  State<_GoalsView> createState() => _GoalsViewState();
}

class _GoalsViewState extends State<_GoalsView> {
  bool _showCompleted = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Goals'),
        leading: BackButton(
          color: AppColors.textSecondary,
          onPressed: () => context.go(Routes.dashboard),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            child: IconButton(
              icon: const Icon(Icons.add_rounded),
              color: AppColors.secondary,
              style: IconButton.styleFrom(
                backgroundColor:
                    AppColors.secondary.withValues(alpha: 0.12),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () => _showCreateDialog(context),
            ),
          ),
        ],
      ),
      body: BlocBuilder<GoalsBloc, GoalsState>(
        builder: (context, state) {
          if (state is GoalsLoading || state is GoalsInitial) {
            return const Center(
                child: CircularProgressIndicator(
                    color: AppColors.secondary));
          }
          if (state is GoalsError) {
            return Center(
                child: Text(state.message,
                    style: Theme.of(context).textTheme.bodyLarge));
          }
          if (state is GoalsSuccess) {
            final active =
                state.goals.where((g) => !g.isCompleted).toList();
            final completed =
                state.goals.where((g) => g.isCompleted).toList();
            final visible = _showCompleted ? state.goals : active;

            return RefreshIndicator(
              onRefresh: () async =>
                  context.read<GoalsBloc>().add(GoalsLoadRequested()),
              color: AppColors.secondary,
              backgroundColor: AppColors.surface,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                children: [
                  if (completed.isNotEmpty)
                    GestureDetector(
                      onTap: () => setState(
                          () => _showCompleted = !_showCompleted),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.success.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                              color: AppColors.success
                                  .withValues(alpha: 0.2)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.check_circle_outline,
                                size: 16, color: AppColors.success),
                            const SizedBox(width: 8),
                            Text(
                              _showCompleted
                                  ? 'Hide ${completed.length} completed'
                                  : 'Show ${completed.length} completed',
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.success,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const Spacer(),
                            Icon(
                              _showCompleted
                                  ? Icons.expand_less
                                  : Icons.expand_more,
                              size: 16,
                              color: AppColors.success,
                            ),
                          ],
                        ),
                      ),
                    ),
                  if (visible.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 60),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.flag_outlined,
                              size: 48, color: AppColors.textTertiary),
                          const SizedBox(height: 16),
                          Text('No goals yet. Tap + to create one.',
                              style:
                                  Theme.of(context).textTheme.bodyMedium),
                        ],
                      ),
                    )
                  else
                    ...visible.map((g) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _GoalCard(goal: g),
                        )),
                ],
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 3),
    );
  }

  void _showCreateDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (sheetCtx) => BlocProvider.value(
        value: context.read<GoalsBloc>(),
        child: const _CreateGoalSheet(),
      ),
    );
  }
}

class _GoalCard extends StatefulWidget {
  final Goal goal;
  const _GoalCard({required this.goal});

  @override
  State<_GoalCard> createState() => _GoalCardState();
}

class _GoalCardState extends State<_GoalCard> {
  late double _sliderValue;

  @override
  void initState() {
    super.initState();
    _sliderValue = widget.goal.progress.toDouble();
  }

  @override
  void didUpdateWidget(_GoalCard old) {
    super.didUpdateWidget(old);
    if (old.goal.progress != widget.goal.progress) {
      _sliderValue = widget.goal.progress.toDouble();
    }
  }

  Future<void> _onSliderEnd(double value) async {
    final rounded = value.round();

    if (rounded == 100) {
      // Show completion confirmation
      final confirmed = await showDialog<bool>(
        context: context,
        barrierColor: Colors.black.withValues(alpha: 0.6),
        builder: (ctx) => Dialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20)),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.emoji_events_outlined,
                      color: Color(0xFFF59E0B), size: 32),
                ),
                const SizedBox(height: 16),
                Text('Goal complete!',
                    style: Theme.of(ctx).textTheme.titleMedium,
                    textAlign: TextAlign.center),
                const SizedBox(height: 8),
                Text(
                  'Mark "${widget.goal.title}" as 100% complete?',
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
                          backgroundColor: const Color(0xFFF59E0B),
                        ),
                        child: const Text('Complete!'),
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
        context.read<GoalsBloc>().add(
              GoalProgressUpdated(goalId: widget.goal.id, progress: 100),
            );
      } else {
        // Reset slider if cancelled
        setState(() => _sliderValue = widget.goal.progress.toDouble());
      }
    } else {
      context.read<GoalsBloc>().add(
            GoalProgressUpdated(
                goalId: widget.goal.id, progress: rounded),
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isCompleted = widget.goal.isCompleted;

    return GlassCard(
      borderColor: isCompleted
          ? AppColors.success.withValues(alpha: 0.25)
          : AppColors.secondary.withValues(alpha: 0.15),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: isCompleted
                      ? AppColors.success.withValues(alpha: 0.12)
                      : AppColors.secondary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  isCompleted
                      ? Icons.check_circle_outline
                      : Icons.flag_outlined,
                  color: isCompleted
                      ? AppColors.success
                      : AppColors.secondary,
                  size: 16,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  widget.goal.title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontSize: 15,
                        decoration: isCompleted
                            ? TextDecoration.lineThrough
                            : null,
                        decorationColor: AppColors.textTertiary,
                        color: isCompleted
                            ? AppColors.textTertiary
                            : AppColors.textPrimary,
                      ),
                ),
              ),
              // Delete
              GestureDetector(
                onTap: () => _onDelete(context),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(6),
                    color: AppColors.error.withValues(alpha: 0.08),
                  ),
                  child: const Icon(Icons.close,
                      size: 14, color: AppColors.textTertiary),
                ),
              ),
            ],
          ),

          if (widget.goal.description != null) ...[
            const SizedBox(height: 8),
            Text(widget.goal.description!,
                style: Theme.of(context).textTheme.bodyMedium),
          ],

          if (widget.goal.targetDate != null) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.calendar_today_outlined,
                    size: 11, color: AppColors.textTertiary),
                const SizedBox(width: 4),
                Text(
                  'Target: ${widget.goal.targetDate}',
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.textTertiary),
                ),
              ],
            ),
          ],

          const SizedBox(height: 14),

          // Progress label
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Progress',
                  style: Theme.of(context).textTheme.bodyMedium),
              ShaderMask(
                blendMode: BlendMode.srcIn,
                shaderCallback: (bounds) => LinearGradient(
                  colors: isCompleted
                      ? [
                          const Color(0xFF10B981),
                          const Color(0xFF34D399),
                        ]
                      : [
                          const Color(0xFFA855F7),
                          const Color(0xFFC084FC),
                        ],
                ).createShader(
                    Rect.fromLTWH(0, 0, bounds.width, bounds.height)),
                child: Text(
                  '${widget.goal.progress}%',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: widget.goal.progress / 100,
              minHeight: 6,
              backgroundColor: AppColors.border,
              valueColor: AlwaysStoppedAnimation(
                isCompleted ? AppColors.success : AppColors.secondary,
              ),
            ),
          ),

          // Slider with 100% confirmation
          if (!isCompleted) ...[
            const SizedBox(height: 4),
            SliderTheme(
              data: SliderTheme.of(context).copyWith(
                trackHeight: 2,
                thumbShape:
                    const RoundSliderThumbShape(enabledThumbRadius: 7),
                overlayShape:
                    const RoundSliderOverlayShape(overlayRadius: 14),
              ),
              child: Slider(
                value: _sliderValue,
                min: 0,
                max: 100,
                divisions: 20,
                activeColor: AppColors.secondary,
                inactiveColor: AppColors.border,
                label: '${_sliderValue.round()}%',
                onChanged: (v) => setState(() => _sliderValue = v),
                onChangeEnd: _onSliderEnd,
              ),
            ),
          ],
        ],
      ),
    );
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
              Text('Delete goal?',
                  style: Theme.of(ctx).textTheme.titleMedium,
                  textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(
                '"${widget.goal.title}" will be permanently removed.',
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
      context.read<GoalsBloc>().add(GoalDeleteRequested(widget.goal.id));
    }
  }
}

class _CreateGoalSheet extends StatefulWidget {
  const _CreateGoalSheet();

  @override
  State<_CreateGoalSheet> createState() => _CreateGoalSheetState();
}

class _CreateGoalSheetState extends State<_CreateGoalSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String? _targetDate;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    context.read<GoalsBloc>().add(GoalCreateRequested(
          title: _titleCtrl.text.trim(),
          description: _descCtrl.text.trim().isEmpty
              ? null
              : _descCtrl.text.trim(),
          targetDate: _targetDate,
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
            Text('New goal',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            TextFormField(
              controller: _titleCtrl,
              autofocus: true,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(
                  labelText: 'What do you want to achieve?'),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _descCtrl,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(
                  labelText: 'Why is this goal important? (optional)'),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate:
                      DateTime.now().add(const Duration(days: 30)),
                  firstDate: DateTime.now(),
                  lastDate:
                      DateTime.now().add(const Duration(days: 3650)),
                );
                if (picked != null) {
                  setState(() => _targetDate =
                      '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}');
                }
              },
              icon: const Icon(Icons.calendar_today_outlined,
                  size: 16, color: AppColors.textSecondary),
              label: Text(
                _targetDate ?? 'Set target date (optional)',
                style: TextStyle(
                  color: _targetDate != null
                      ? AppColors.secondary
                      : AppColors.textSecondary,
                ),
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
                onPressed: _submit,
                child: const Text('Create goal')),
          ],
        ),
      ),
    );
  }
}
