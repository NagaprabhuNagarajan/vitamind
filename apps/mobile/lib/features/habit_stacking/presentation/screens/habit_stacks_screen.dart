import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/habit_stacking_service.dart';

/// Habit Stacking screen -- lets users group habits into ordered stacks
/// that can be completed together in one tap at a scheduled trigger time.
class HabitStacksScreen extends StatefulWidget {
  const HabitStacksScreen({super.key});

  @override
  State<HabitStacksScreen> createState() => _HabitStacksScreenState();
}

class _HabitStacksScreenState extends State<HabitStacksScreen> {
  final _service = HabitStackingService();

  late final String _userId;

  bool _isLoading = true;
  List<HabitStack> _stacks = [];
  String? _error;

  // Tracks which stacks are currently being completed (for loading state)
  final Set<String> _completingIds = {};

  @override
  void initState() {
    super.initState();
    _userId = Supabase.instance.client.auth.currentUser!.id;
    _loadStacks();
  }

  Future<void> _loadStacks() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final stacks = await _service.fetchStacks(_userId);
      if (!mounted) return;
      setState(() {
        _stacks = stacks;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load habit stacks.';
        _isLoading = false;
      });
    }
  }

  Future<void> _completeStack(HabitStack stack) async {
    setState(() => _completingIds.add(stack.id));

    try {
      await _service.completeStack(_userId, stack.id);
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Stack "${stack.name}" completed!'),
          backgroundColor: AppColors.success,
        ),
      );
      // Reload to reflect updated completion states
      await _loadStacks();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to complete stack.')),
      );
    } finally {
      if (mounted) setState(() => _completingIds.remove(stack.id));
    }
  }

  Future<void> _deleteStack(HabitStack stack) async {
    final confirmed = await showDialog<bool>(
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
                  color: AppColors.error.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.delete_outline_rounded,
                    color: AppColors.error, size: 28),
              ),
              const SizedBox(height: 16),
              Text('Delete stack?',
                  style: Theme.of(ctx).textTheme.titleMedium,
                  textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(
                '"${stack.name}" will be permanently removed.',
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

    if (confirmed != true) return;

    // Optimistic removal
    setState(() => _stacks.removeWhere((s) => s.id == stack.id));

    try {
      await _service.deleteStack(stack.id);
    } catch (_) {
      if (!mounted) return;
      // Revert on failure
      await _loadStacks();
    }
  }

  void _showCreateSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => _CreateStackSheet(
        userId: _userId,
        service: _service,
        onCreated: _loadStacks,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Habit Stacks'),
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
              onPressed: _showCreateSheet,
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.accent))
          : _error != null
              ? _buildError()
              : _stacks.isEmpty
                  ? _buildEmpty()
                  : RefreshIndicator(
                      onRefresh: _loadStacks,
                      color: AppColors.accent,
                      backgroundColor: AppColors.surface,
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                        itemCount: _stacks.length,
                        itemBuilder: (_, i) => _buildStackCard(_stacks[i]),
                      ),
                    ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.warning_amber_rounded,
              size: 40, color: AppColors.warning),
          const SizedBox(height: 12),
          Text(_error!, style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 16),
          OutlinedButton(onPressed: _loadStacks, child: const Text('Retry')),
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.layers_outlined,
              size: 48, color: AppColors.textTertiary),
          const SizedBox(height: 16),
          Text('No habit stacks yet.',
              style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 8),
          Text(
            'Group habits together and complete them\nin one go each day.',
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: _showCreateSheet,
            icon: const Icon(Icons.add_rounded, size: 18),
            label: const Text('Create stack'),
          ),
        ],
      ),
    );
  }

  Widget _buildStackCard(HabitStack stack) {
    final isCompleting = _completingIds.contains(stack.id);
    final habitCount = stack.habitIds.length;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: name + trigger time
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.layers_rounded,
                      size: 18, color: AppColors.primary),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        stack.name,
                        style: Theme.of(context).textTheme.labelLarge,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          if (stack.triggerTime != null) ...[
                            const Icon(Icons.schedule_rounded,
                                size: 12, color: AppColors.textTertiary),
                            const SizedBox(width: 4),
                            Text(
                              stack.triggerTime!,
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textTertiary,
                              ),
                            ),
                            const SizedBox(width: 10),
                          ],
                          Text(
                            '$habitCount habit${habitCount == 1 ? '' : 's'}',
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.textTertiary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Delete button
                GestureDetector(
                  onTap: () => _deleteStack(stack),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.delete_outline_rounded,
                        size: 16, color: AppColors.textTertiary),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 14),

            // Habit list within the stack
            ...List.generate(stack.habitIds.length, (i) {
              final habitId = stack.habitIds[i];
              return Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.accent.withValues(alpha: 0.1),
                      ),
                      child: Center(
                        child: Text(
                          '${i + 1}',
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: AppColors.accent,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        habitId.length > 8
                            ? 'Habit ${habitId.substring(0, 8)}...'
                            : habitId,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textPrimary,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              );
            }),

            const SizedBox(height: 12),

            // Start Stack button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: isCompleting ? null : () => _completeStack(stack),
                icon: isCompleting
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.play_arrow_rounded, size: 18),
                label: Text(isCompleting ? 'Completing...' : 'Start Stack'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accent,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// -- Create Stack Bottom Sheet -----------------------------------------------

class _CreateStackSheet extends StatefulWidget {
  final String userId;
  final HabitStackingService service;
  final VoidCallback onCreated;

  const _CreateStackSheet({
    required this.userId,
    required this.service,
    required this.onCreated,
  });

  @override
  State<_CreateStackSheet> createState() => _CreateStackSheetState();
}

class _CreateStackSheetState extends State<_CreateStackSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _habitIdCtrl = TextEditingController();

  TimeOfDay? _triggerTime;
  final List<String> _habitIds = [];
  bool _isCreating = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _habitIdCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _triggerTime ?? const TimeOfDay(hour: 8, minute: 0),
    );
    if (picked != null) setState(() => _triggerTime = picked);
  }

  void _addHabitId() {
    final id = _habitIdCtrl.text.trim();
    if (id.isEmpty || _habitIds.contains(id)) return;
    setState(() => _habitIds.add(id));
    _habitIdCtrl.clear();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_habitIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add at least one habit to the stack.')),
      );
      return;
    }

    setState(() => _isCreating = true);

    String? triggerStr;
    if (_triggerTime != null) {
      final h = _triggerTime!.hour.toString().padLeft(2, '0');
      final m = _triggerTime!.minute.toString().padLeft(2, '0');
      triggerStr = '$h:$m';
    }

    try {
      await widget.service.createStack(
        widget.userId,
        _nameCtrl.text.trim(),
        _habitIds,
        triggerTime: triggerStr,
      );
      if (!mounted) return;
      Navigator.pop(context);
      widget.onCreated();
    } catch (e) {
      if (!mounted) return;
      setState(() => _isCreating = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to create stack.')),
      );
    }
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
            // Drag handle
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
            Text('New habit stack',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nameCtrl,
              autofocus: true,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(labelText: 'Stack name'),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            // Trigger time
            OutlinedButton.icon(
              onPressed: _pickTime,
              icon: Icon(
                Icons.schedule_rounded,
                size: 16,
                color: _triggerTime != null
                    ? AppColors.accent
                    : AppColors.textSecondary,
              ),
              label: Text(
                _triggerTime != null
                    ? 'Trigger: ${_triggerTime!.format(context)}'
                    : 'Set trigger time (optional)',
                style: TextStyle(
                  color: _triggerTime != null
                      ? AppColors.accent
                      : AppColors.textSecondary,
                ),
              ),
            ),
            const SizedBox(height: 12),
            // Add habit IDs
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _habitIdCtrl,
                    style: const TextStyle(color: AppColors.textPrimary),
                    decoration:
                        const InputDecoration(labelText: 'Habit ID'),
                    onFieldSubmitted: (_) => _addHabitId(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: _addHabitId,
                  icon: const Icon(Icons.add_circle_outline_rounded),
                  color: AppColors.accent,
                ),
              ],
            ),
            if (_habitIds.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: _habitIds
                    .asMap()
                    .entries
                    .map((entry) => Chip(
                          label: Text(
                            '${entry.key + 1}. ${entry.value.length > 8 ? '${entry.value.substring(0, 8)}...' : entry.value}',
                            style: const TextStyle(fontSize: 12),
                          ),
                          deleteIcon: const Icon(Icons.close, size: 14),
                          onDeleted: () =>
                              setState(() => _habitIds.removeAt(entry.key)),
                        ))
                    .toList(),
              ),
            ],
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isCreating ? null : _submit,
              child: _isCreating
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Create stack'),
            ),
          ],
        ),
      ),
    );
  }
}
