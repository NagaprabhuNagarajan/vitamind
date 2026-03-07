import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/task_service.dart';
import '../bloc/tasks_bloc.dart';
import '../../../../features/smart_schedule/data/smart_schedule_service.dart';

// Formats "HH:MM" (24-hour) to "h:MM AM/PM"
String _formatTaskTime(String hhmm) {
  final parts = hhmm.split(':');
  final h = int.parse(parts[0]);
  final m = parts[1];
  final period = h >= 12 ? 'PM' : 'AM';
  final hour = h % 12 == 0 ? 12 : h % 12;
  return '$hour:$m $period';
}

class TasksScreen extends StatelessWidget {
  const TasksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final userId = Supabase.instance.client.auth.currentUser!.id;
    return BlocProvider(
      create: (_) =>
          TasksBloc(TaskService(), userId)..add(TasksLoadRequested()),
      child: const _TasksView(),
    );
  }
}

class _TasksView extends StatefulWidget {
  const _TasksView();

  @override
  State<_TasksView> createState() => _TasksViewState();
}

class _TasksViewState extends State<_TasksView> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Tasks'),
        leading: BackButton(
          color: AppColors.textSecondary,
          onPressed: () => context.go(Routes.dashboard),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            child: IconButton(
              icon: const Icon(Icons.add_rounded),
              color: AppColors.primary,
              tooltip: 'Create new task',
              style: IconButton.styleFrom(
                backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () => _showCreateDialog(context),
            ),
          ),
        ],
      ),
      body: BlocListener<TasksBloc, TasksState>(
        listenWhen: (_, curr) => curr is TasksError,
        listener: (context, state) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text((state as TasksError).message),
              backgroundColor: AppColors.error,
              behavior: SnackBarBehavior.floating,
            ),
          );
        },
        child: Column(
          children: [
            // Search field
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
              child: TextField(
                controller: _searchController,
                onChanged: (value) => setState(() => _searchQuery = value),
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.textPrimary,
                ),
                decoration: InputDecoration(
                  hintText: 'Search tasks...',
                  hintStyle: const TextStyle(
                    color: AppColors.textTertiary,
                    fontSize: 14,
                  ),
                  prefixIcon: const Icon(
                    Icons.search_rounded,
                    size: 20,
                    color: AppColors.textTertiary,
                  ),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          tooltip: 'Clear search',
                          icon: const Icon(Icons.close_rounded,
                              size: 18, color: AppColors.textTertiary),
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _searchQuery = '');
                          },
                        )
                      : null,
                  filled: true,
                  fillColor: AppColors.surfaceEl,
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.primary),
                  ),
                ),
              ),
            ),
            _FilterBar(),
            Expanded(
              child: BlocBuilder<TasksBloc, TasksState>(
                buildWhen: (_, curr) => curr is! TasksError,
                builder: (context, state) {
                  if (state is TasksLoading || state is TasksInitial) {
                    return const Center(
                        child: CircularProgressIndicator(
                            color: AppColors.primary));
                  }
                  if (state is TasksSuccess) {
                    final tasks = _filteredTasks(
                        state.tasks, state.filter, _searchQuery);
                    if (tasks.isEmpty) {
                      return _EmptyState(
                        message: _searchQuery.isNotEmpty
                            ? 'No tasks match your search.'
                            : state.filter == null
                                ? 'No tasks yet. Tap + to create one.'
                                : 'No tasks match this filter.',
                      );
                    }
                    return ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                      itemCount: tasks.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (ctx, i) => _TaskTile(task: tasks[i]),
                    );
                  }
                  return const SizedBox.shrink();
                },
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 1),
    );
  }

  List<Task> _filteredTasks(List<Task> tasks, String? filter, String search) {
    var result = tasks;

    // Apply status filter
    if (filter != null) {
      switch (filter) {
        case 'pending':
          result =
              result.where((t) => t.status == TaskStatus.pending).toList();
        case 'in_progress':
          result =
              result.where((t) => t.status == TaskStatus.inProgress).toList();
        case 'completed':
          result =
              result.where((t) => t.status == TaskStatus.completed).toList();
      }
    }

    // Apply search filter on title (case-insensitive)
    if (search.isNotEmpty) {
      final query = search.toLowerCase();
      result = result
          .where((t) => t.title.toLowerCase().contains(query))
          .toList();
    }

    return result;
  }

  void _showCreateDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (sheetCtx) => BlocProvider.value(
        value: context.read<TasksBloc>(),
        child: const _CreateTaskSheet(),
      ),
    );
  }
}

// ─── Confirmation dialog ──────────────────────────────────────────────────────

Future<bool> _showConfirmDialog(
  BuildContext context, {
  required String title,
  required String message,
  required String confirmLabel,
  required Color confirmColor,
  required IconData icon,
}) async {
  final result = await showDialog<bool>(
    context: context,
    barrierColor: Colors.black.withValues(alpha: 0.6),
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
                color: confirmColor.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: confirmColor, size: 28),
            ),
            const SizedBox(height: 16),
            Text(title,
                style: Theme.of(ctx).textTheme.titleMedium,
                textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(message,
                style: Theme.of(ctx).textTheme.bodyMedium,
                textAlign: TextAlign.center),
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
                      backgroundColor: confirmColor,
                    ),
                    child: Text(confirmLabel),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ),
  );
  return result ?? false;
}

// ─── Task tile with context menu ──────────────────────────────────────────────

class _TaskTile extends StatelessWidget {
  final Task task;
  const _TaskTile({required this.task});

  Color _priorityColor(TaskPriority p) {
    return switch (p) {
      TaskPriority.urgent => AppColors.error,
      TaskPriority.high => AppColors.warning,
      TaskPriority.medium => AppColors.secondary,
      TaskPriority.low => AppColors.textTertiary,
    };
  }

  @override
  Widget build(BuildContext context) {
    final isDone = task.status == TaskStatus.completed;
    final isInProgress = task.status == TaskStatus.inProgress;
    final priorityColor = _priorityColor(task.priority);

    return GlassCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      borderColor: isDone
          ? AppColors.success.withValues(alpha: 0.2)
          : isInProgress
              ? AppColors.primary.withValues(alpha: 0.2)
              : AppColors.border,
      child: Row(
        children: [
          // Status indicator circle
          _StatusCircle(task: task),
          const SizedBox(width: 12),

          // Title + subtitle
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        task.title,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: isDone
                              ? AppColors.textTertiary
                              : AppColors.textPrimary,
                          decoration:
                              isDone ? TextDecoration.lineThrough : null,
                          decorationColor: AppColors.textTertiary,
                        ),
                      ),
                    ),
                    if (task.isRecurring) ...[
                      const SizedBox(width: 6),
                      Icon(
                        Icons.repeat_rounded,
                        size: 14,
                        color: AppColors.primary.withValues(alpha: 0.8),
                      ),
                    ],
                  ],
                ),
                if (task.dueDate != null) ...[
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today_outlined,
                          size: 11, color: AppColors.textTertiary),
                      const SizedBox(width: 4),
                      Text(
                        task.dueTime != null
                            ? 'Due ${task.dueDate} · ${_formatTaskTime(task.dueTime!)}'
                            : 'Due ${task.dueDate}',
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.textTertiary),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),

          // Priority badge
          _PriorityBadge(priority: task.priority, color: priorityColor),
          const SizedBox(width: 6),

          // Context menu
          _TaskMenu(task: task),
        ],
      ),
    );
  }
}

class _StatusCircle extends StatelessWidget {
  final Task task;
  const _StatusCircle({required this.task});

  @override
  Widget build(BuildContext context) {
    final isDone = task.status == TaskStatus.completed;
    final isInProgress = task.status == TaskStatus.inProgress;
    final statusLabel = isDone
        ? 'Completed'
        : isInProgress
            ? 'In progress'
            : 'To do';

    return Semantics(
      label: 'Status: $statusLabel',
      child: AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      width: 24,
      height: 24,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isDone
            ? AppColors.success.withValues(alpha: 0.15)
            : isInProgress
                ? AppColors.primary.withValues(alpha: 0.1)
                : Colors.transparent,
        border: isDone
            ? null
            : Border.all(
                color: isInProgress
                    ? AppColors.primary
                    : AppColors.textTertiary.withValues(alpha: 0.5),
                width: 1.5,
              ),
      ),
      child: isDone
          ? const Icon(Icons.check, size: 14, color: AppColors.success)
          : isInProgress
              ? Center(
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.primary,
                    ),
                  ),
                )
              : null,
    ),
    );
  }
}

class _TaskMenu extends StatelessWidget {
  final Task task;
  const _TaskMenu({required this.task});

  @override
  Widget build(BuildContext context) {
    final isPending = task.status == TaskStatus.pending;
    final isInProgress = task.status == TaskStatus.inProgress;
    final isDone = task.status == TaskStatus.completed;

    return PopupMenuButton<String>(
      tooltip: 'Task actions',
      icon: const Icon(Icons.more_vert_rounded,
          size: 18, color: AppColors.textTertiary),
      color: AppColors.surfaceEl,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
      padding: EdgeInsets.zero,
      itemBuilder: (_) => [
        if (isPending)
          _menuItem('start', Icons.play_arrow_rounded, 'Start',
              AppColors.primary),
        if (isPending || isInProgress)
          _menuItem('complete', Icons.check_circle_outline_rounded,
              'Complete', AppColors.success),
        if (isInProgress || isDone)
          _menuItem('revert', Icons.undo_rounded, 'Revert',
              AppColors.warning),
        _menuItem(
            'delete', Icons.delete_outline_rounded, 'Delete', AppColors.error),
      ],
      onSelected: (value) => _handleAction(context, value),
    );
  }

  PopupMenuItem<String> _menuItem(
      String value, IconData icon, String label, Color color) {
    return PopupMenuItem(
      value: value,
      child: Row(
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 10),
          Text(label,
              style: TextStyle(
                  fontSize: 14,
                  color: color,
                  fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Future<void> _handleAction(BuildContext context, String action) async {
    final bloc = context.read<TasksBloc>();

    switch (action) {
      case 'start':
        bloc.add(TaskStatusUpdateRequested(
            taskId: task.id, status: TaskStatus.inProgress));

      case 'complete':
        final confirmed = await _showConfirmDialog(
          context,
          title: 'Complete task?',
          message: '"${task.title}" will be marked as done.',
          confirmLabel: 'Complete',
          confirmColor: AppColors.success,
          icon: Icons.check_circle_outline_rounded,
        );
        if (confirmed) {
          bloc.add(TaskStatusUpdateRequested(
              taskId: task.id, status: TaskStatus.completed));
        }

      case 'revert':
        final confirmed = await _showConfirmDialog(
          context,
          title: 'Revert task?',
          message: '"${task.title}" will be moved back to pending.',
          confirmLabel: 'Revert',
          confirmColor: AppColors.warning,
          icon: Icons.undo_rounded,
        );
        if (confirmed) {
          bloc.add(TaskStatusUpdateRequested(
              taskId: task.id, status: TaskStatus.pending));
        }

      case 'delete':
        final confirmed = await _showConfirmDialog(
          context,
          title: 'Delete task?',
          message: '"${task.title}" will be permanently removed.',
          confirmLabel: 'Delete',
          confirmColor: AppColors.error,
          icon: Icons.delete_outline_rounded,
        );
        if (confirmed) {
          bloc.add(TaskDeleteRequested(task.id));
        }
    }
  }
}

// ─── Supporting widgets ───────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  final String message;
  const _EmptyState({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.task_alt_outlined,
              size: 48, color: AppColors.textTertiary),
          const SizedBox(height: 16),
          Text(message,
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

class _FilterBar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocBuilder<TasksBloc, TasksState>(
      builder: (context, state) {
        final filter = state is TasksSuccess ? state.filter : null;
        return SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            children: [
              _FilterChip(label: 'All', value: null, current: filter),
              const SizedBox(width: 8),
              _FilterChip(label: 'Pending', value: 'pending', current: filter),
              const SizedBox(width: 8),
              _FilterChip(
                  label: 'In Progress',
                  value: 'in_progress',
                  current: filter),
              const SizedBox(width: 8),
              _FilterChip(
                  label: 'Done', value: 'completed', current: filter),
            ],
          ),
        );
      },
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final String? value;
  final String? current;

  const _FilterChip(
      {required this.label, required this.value, required this.current});

  @override
  Widget build(BuildContext context) {
    final selected = value == current;
    return Semantics(
      button: true,
      selected: selected,
      label: 'Filter: $label',
      child: GestureDetector(
      onTap: () =>
          context.read<TasksBloc>().add(TaskFilterChanged(value)),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.primary.withValues(alpha: 0.15)
              : AppColors.surfaceEl,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected
                ? AppColors.primary.withValues(alpha: 0.4)
                : AppColors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
            color: selected ? AppColors.primary : AppColors.textSecondary,
          ),
        ),
      ),
    ),
    );
  }
}

class _PriorityBadge extends StatelessWidget {
  final TaskPriority priority;
  final Color color;
  const _PriorityBadge({required this.priority, required this.color});

  @override
  Widget build(BuildContext context) {
    final label = switch (priority) {
      TaskPriority.urgent => 'Urgent',
      TaskPriority.high => 'High',
      TaskPriority.medium => 'Med',
      TaskPriority.low => 'Low',
    };
    return Semantics(
      label: 'Priority: $label',
      child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Text(
        label,
        style: TextStyle(
            fontSize: 10,
            color: color,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.3),
      ),
    ),
    );
  }
}

// ─── Create task sheet ────────────────────────────────────────────────────────

class _CreateTaskSheet extends StatefulWidget {
  const _CreateTaskSheet();

  @override
  State<_CreateTaskSheet> createState() => _CreateTaskSheetState();
}

class _CreateTaskSheetState extends State<_CreateTaskSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  TaskPriority _priority = TaskPriority.medium;
  String? _dueDate;
  String? _dueTime; // HH:MM
  bool _isRecurring = false;
  RecurrencePattern _recurrencePattern = RecurrencePattern.weekly;
  String? _recurrenceEndDate;

  // Smart schedule state
  final _smartSchedule = SmartScheduleService();
  bool _suggestingTime = false;
  List<TimeSlot> _timeSlots = [];

  Future<void> _suggestTime() async {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) return;
    setState(() {
      _suggestingTime = true;
      _timeSlots = [];
    });
    try {
      final result = await _smartSchedule.suggestSlots(
        title: title,
        priority: _priority.name,
        date: _dueDate,
      );
      if (!mounted) return;
      setState(() => _timeSlots = result.slots);
    } catch (_) {
      // Silently fail — user can pick time manually
    } finally {
      if (mounted) setState(() => _suggestingTime = false);
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    context.read<TasksBloc>().add(TaskCreateRequested(
          title: _titleCtrl.text.trim(),
          description: _descCtrl.text.trim().isEmpty
              ? null
              : _descCtrl.text.trim(),
          priority: _priority,
          dueDate: _dueDate,
          dueTime: _dueTime,
          isRecurring: _isRecurring,
          recurrencePattern: _isRecurring ? _recurrencePattern : null,
          recurrenceEndDate: _isRecurring ? _recurrenceEndDate : null,
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
            Text('New task',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            TextFormField(
              controller: _titleCtrl,
              autofocus: true,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(labelText: 'Title'),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _descCtrl,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(
                  labelText: 'Description (optional)'),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<TaskPriority>(
              initialValue: _priority,
              dropdownColor: AppColors.surfaceEl,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(labelText: 'Priority'),
              items: TaskPriority.values
                  .map((p) => DropdownMenuItem(
                        value: p,
                        child: Text(
                            p.name[0].toUpperCase() + p.name.substring(1)),
                      ))
                  .toList(),
              onChanged: (v) => setState(() => _priority = v!),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: DateTime.now(),
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) {
                        setState(() => _dueDate =
                            '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}');
                      }
                    },
                    icon: const Icon(Icons.calendar_today_outlined,
                        size: 16, color: AppColors.textSecondary),
                    label: Text(
                      _dueDate ?? 'Date',
                      style: TextStyle(
                        color: _dueDate != null
                            ? AppColors.primary
                            : AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      final picked = await showTimePicker(
                        context: context,
                        initialTime: TimeOfDay.now(),
                      );
                      if (picked != null) {
                        setState(() => _dueTime =
                            '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}');
                      }
                    },
                    icon: const Icon(Icons.access_time_outlined,
                        size: 16, color: AppColors.textSecondary),
                    label: Text(
                      _dueTime != null ? _formatTaskTime(_dueTime!) : 'Time',
                      style: TextStyle(
                        color: _dueTime != null
                            ? AppColors.primary
                            : AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            // Smart schedule button
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: _suggestingTime ? null : _suggestTime,
                icon: _suggestingTime
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: AppColors.primary),
                      )
                    : const Icon(Icons.auto_awesome_rounded,
                        size: 14, color: AppColors.primary),
                label: Text(
                  _suggestingTime ? 'Finding best time…' : 'Suggest time',
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.primary),
                ),
                style: TextButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  backgroundColor:
                      AppColors.primary.withValues(alpha: 0.08),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ),
            // Time slot chips
            if (_timeSlots.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: _timeSlots
                    .map((slot) => GestureDetector(
                          onTap: () => setState(() {
                            _dueTime = slot.time;
                            _timeSlots = [];
                          }),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                  color:
                                      AppColors.primary.withValues(alpha: 0.3),
                                  width: 1),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  slot.label,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.primary,
                                  ),
                                ),
                                Text(
                                  slot.reason,
                                  style: const TextStyle(
                                    fontSize: 10,
                                    color: AppColors.textTertiary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ))
                    .toList(),
              ),
            ],
            const SizedBox(height: 12),
            // Recurring toggle
            Row(
              children: [
                const Icon(Icons.repeat_rounded,
                    size: 18, color: AppColors.textSecondary),
                const SizedBox(width: 8),
                const Text('Repeat',
                    style: TextStyle(
                        color: AppColors.textPrimary, fontSize: 14)),
                const Spacer(),
                Switch.adaptive(
                  value: _isRecurring,
                  activeColor: AppColors.primary,
                  onChanged: (v) => setState(() => _isRecurring = v),
                ),
              ],
            ),
            if (_isRecurring) ...[
              const SizedBox(height: 8),
              DropdownButtonFormField<RecurrencePattern>(
                value: _recurrencePattern,
                dropdownColor: AppColors.surfaceEl,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration:
                    const InputDecoration(labelText: 'Frequency'),
                items: RecurrencePattern.values
                    .map((p) => DropdownMenuItem(
                          value: p,
                          child: Text(
                              p.name[0].toUpperCase() + p.name.substring(1)),
                        ))
                    .toList(),
                onChanged: (v) =>
                    setState(() => _recurrencePattern = v!),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate:
                        DateTime.now().add(const Duration(days: 30)),
                    firstDate: DateTime.now(),
                    lastDate:
                        DateTime.now().add(const Duration(days: 730)),
                  );
                  if (picked != null) {
                    setState(() => _recurrenceEndDate =
                        '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}');
                  }
                },
                icon: const Icon(Icons.event_outlined,
                    size: 16, color: AppColors.textSecondary),
                label: Text(
                  _recurrenceEndDate ?? 'End date (optional)',
                  style: TextStyle(
                    color: _recurrenceEndDate != null
                        ? AppColors.primary
                        : AppColors.textSecondary,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 20),
            ElevatedButton(
                onPressed: _submit,
                child: const Text('Create task')),
          ],
        ),
      ),
    );
  }
}
