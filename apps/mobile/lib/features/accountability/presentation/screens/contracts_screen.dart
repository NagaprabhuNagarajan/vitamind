import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/accountability_service.dart';

/// Accountability Contracts screen -- lets users create self-imposed
/// commitments with stakes, track daily/weekly check-ins, and visualize
/// consistency through a 14-day dot grid with streak counting.
class ContractsScreen extends StatefulWidget {
  const ContractsScreen({super.key});

  @override
  State<ContractsScreen> createState() => _ContractsScreenState();
}

class _ContractsScreenState extends State<ContractsScreen> {
  final _service = AccountabilityService();

  late final String _userId;

  bool _isLoading = true;
  List<Contract> _contracts = [];
  Map<String, List<ContractCheckin>> _checkins = {};
  final Set<String> _checkingIn = {};
  String? _error;
  bool _showPast = false;

  @override
  void initState() {
    super.initState();
    _userId = Supabase.instance.client.auth.currentUser!.id;
    _loadAll();
  }

  Future<void> _loadAll() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final contracts = await _service.fetchAll(_userId);
      final checkinsMap = <String, List<ContractCheckin>>{};

      // Load check-ins for active contracts in parallel
      await Future.wait(
        contracts
            .where((c) => c.status == 'active')
            .map((c) async {
          try {
            checkinsMap[c.id] = await _service.fetchCheckins(c.id);
          } catch (_) {
            // Non-critical -- dots will show gray
          }
        }),
      );

      if (!mounted) return;
      setState(() {
        _contracts = contracts;
        _checkins = checkinsMap;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load contracts.';
        _isLoading = false;
      });
    }
  }

  Future<void> _doCheckin(String contractId, bool met) async {
    setState(() => _checkingIn.add(contractId));

    try {
      await _service.checkin(contractId, _userId, met);
      if (!mounted) return;

      // Reload just this contract's check-ins
      try {
        final updated = await _service.fetchCheckins(contractId);
        if (mounted) setState(() => _checkins[contractId] = updated);
      } catch (_) {}

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(met ? 'Commitment met!' : 'Marked as missed.'),
          backgroundColor: met ? AppColors.success : AppColors.warning,
        ),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Check-in failed.')),
      );
    } finally {
      if (mounted) setState(() => _checkingIn.remove(contractId));
    }
  }

  Future<void> _cancelContract(String contractId) async {
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
                child: const Icon(Icons.cancel_outlined,
                    color: AppColors.error, size: 28),
              ),
              const SizedBox(height: 16),
              Text('Cancel contract?',
                  style: Theme.of(ctx).textTheme.titleMedium,
                  textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(
                'This contract will be moved to past contracts.',
                style: Theme.of(ctx).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      child: const Text('Keep'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(ctx, true),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.error,
                      ),
                      child: const Text('Cancel it'),
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

    try {
      await _service.cancel(contractId);
      if (!mounted) return;
      await _loadAll();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not cancel contract.')),
      );
    }
  }

  void _showCreateSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => _CreateContractSheet(
        userId: _userId,
        service: _service,
        onCreated: _loadAll,
      ),
    );
  }

  static String _todayStr() {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}'
        '-${now.day.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final active = _contracts.where((c) => c.status == 'active').toList();
    final past = _contracts.where((c) => c.status != 'active').toList();

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(title: const Text('Accountability')),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateSheet,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add_rounded, color: Colors.white),
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.accent))
          : _error != null
              ? _buildError()
              : RefreshIndicator(
                  onRefresh: _loadAll,
                  color: AppColors.accent,
                  backgroundColor: AppColors.surface,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
                    children: [
                      if (active.isEmpty)
                        _buildEmptyActive()
                      else
                        ...active.map(_buildContractCard),
                      if (past.isNotEmpty) ...[
                        const SizedBox(height: 20),
                        _buildPastHeader(past.length),
                        if (_showPast)
                          ...past.map(_buildPastCard),
                      ],
                    ],
                  ),
                ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }

  // -- Helpers ---------------------------------------------------------------

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
          OutlinedButton(onPressed: _loadAll, child: const Text('Retry')),
        ],
      ),
    );
  }

  Widget _buildEmptyActive() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.handshake_outlined,
                size: 48,
                color: AppColors.textTertiary.withValues(alpha: 0.5)),
            const SizedBox(height: 16),
            Text('No active contracts.',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              'Create a commitment to hold yourself\naccountable.',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  // -- Active Contract Card --------------------------------------------------

  Widget _buildContractCard(Contract c) {
    final cis = _checkins[c.id] ?? [];
    final isCheckingIn = _checkingIn.contains(c.id);
    final today = _todayStr();
    final checkedToday = cis.any((ci) => ci.date == today);

    // Calculate streak from consecutive met check-ins (newest first)
    int streak = 0;
    final sorted = [...cis]..sort((a, b) => b.date.compareTo(a.date));
    for (final ci in sorted) {
      if (ci.met) {
        streak++;
      } else {
        break;
      }
    }

    final progressVal = c.progress.clamp(0, 100) / 100.0;
    final progressColor = c.progress >= 80
        ? AppColors.success
        : c.progress >= 50
            ? AppColors.warning
            : AppColors.error;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        padding: const EdgeInsets.all(16),
        borderColor: (c.misses >= 3 ? AppColors.error : AppColors.primary)
            .withValues(alpha: 0.25),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.handshake_rounded,
                      size: 18, color: AppColors.primary),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(c.title,
                          style: Theme.of(context).textTheme.labelLarge,
                          overflow: TextOverflow.ellipsis),
                      if (c.commitment.isNotEmpty)
                        Text(
                          c.commitment,
                          style: const TextStyle(
                              fontSize: 12, color: AppColors.textTertiary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                  ),
                ),
                // Streak badge
                if (streak > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.accent.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.local_fire_department_rounded,
                            size: 12, color: AppColors.accent),
                        const SizedBox(width: 2),
                        Text('$streak',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppColors.accent,
                            )),
                      ],
                    ),
                  ),
                const SizedBox(width: 4),
                GestureDetector(
                  onTap: () => _cancelContract(c.id),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Icon(Icons.close,
                        size: 14, color: AppColors.textTertiary),
                  ),
                ),
              ],
            ),

            // Stakes
            if (c.stakes != null && c.stakes!.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                      color: AppColors.warning.withValues(alpha: 0.15)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.local_fire_department_rounded,
                        size: 14, color: AppColors.warning),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text('Stakes: ${c.stakes}',
                          style: const TextStyle(
                              fontSize: 12, color: AppColors.textSecondary)),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 14),

            // Progress bar
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: progressVal,
                      minHeight: 6,
                      backgroundColor: AppColors.border,
                      valueColor: AlwaysStoppedAnimation(progressColor),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Text('${c.progress}%',
                    style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary)),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${c.misses} miss${c.misses == 1 ? '' : 'es'}  |  ${c.checkInFrequency}',
              style: Theme.of(context).textTheme.labelSmall,
            ),

            const SizedBox(height: 14),

            // 14-day check-in dots
            _buildCheckInDots(cis),

            const SizedBox(height: 14),

            // Check-in buttons or "checked in" label
            if (checkedToday)
              Center(
                child: Text('Checked in today',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: AppColors.success,
                        )),
              )
            else
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: isCheckingIn
                          ? null
                          : () => _doCheckin(c.id, true),
                      icon: isCheckingIn
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.check_rounded, size: 16),
                      label: const Text('Met today'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.success,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: isCheckingIn
                          ? null
                          : () => _doCheckin(c.id, false),
                      icon: const Icon(Icons.close_rounded, size: 16),
                      label: const Text('Missed'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.error,
                        side: BorderSide(
                            color: AppColors.error.withValues(alpha: 0.3)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  /// 14 dots for the last 14 days: green = met, red = missed, gray = no data.
  Widget _buildCheckInDots(List<ContractCheckin> checkins) {
    final Map<String, bool> dateMap = {};
    for (final ci in checkins) {
      dateMap[ci.date] = ci.met;
    }

    final now = DateTime.now();

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: List.generate(14, (i) {
        final date = now.subtract(Duration(days: 13 - i));
        final dateStr =
            '${date.year}-${date.month.toString().padLeft(2, '0')}'
            '-${date.day.toString().padLeft(2, '0')}';
        final met = dateMap[dateStr];

        Color dotColor;
        if (met == true) {
          dotColor = AppColors.success;
        } else if (met == false) {
          dotColor = AppColors.error;
        } else {
          dotColor = AppColors.border;
        }

        return Tooltip(
          message: dateStr,
          child: Container(
            width: 16,
            height: 16,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: dotColor.withValues(alpha: met == null ? 0.4 : 0.8),
            ),
          ),
        );
      }),
    );
  }

  // -- Past contracts (collapsible) ------------------------------------------

  Widget _buildPastHeader(int count) {
    return GestureDetector(
      onTap: () => setState(() => _showPast = !_showPast),
      child: Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(
          children: [
            Icon(
              _showPast
                  ? Icons.keyboard_arrow_down_rounded
                  : Icons.keyboard_arrow_right_rounded,
              size: 20,
              color: AppColors.textTertiary,
            ),
            const SizedBox(width: 4),
            Text('Past contracts ($count)',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: AppColors.textSecondary,
                    )),
          ],
        ),
      ),
    );
  }

  Widget _buildPastCard(Contract c) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GlassCard(
        padding: const EdgeInsets.all(14),
        color: AppColors.surfaceEl,
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.textTertiary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.handshake_outlined,
                  size: 16, color: AppColors.textTertiary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(c.title,
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 2),
                  Text(
                    '${c.startDate} - ${c.endDate}',
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textTertiary),
                  ),
                ],
              ),
            ),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: c.status == 'completed'
                    ? AppColors.success.withValues(alpha: 0.12)
                    : AppColors.textTertiary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                c.status,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: c.status == 'completed'
                      ? AppColors.success
                      : AppColors.textTertiary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// -- Create Contract Bottom Sheet --------------------------------------------

class _CreateContractSheet extends StatefulWidget {
  final String userId;
  final AccountabilityService service;
  final VoidCallback onCreated;

  const _CreateContractSheet({
    required this.userId,
    required this.service,
    required this.onCreated,
  });

  @override
  State<_CreateContractSheet> createState() => _CreateContractSheetState();
}

class _CreateContractSheetState extends State<_CreateContractSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _commitCtrl = TextEditingController();
  final _stakesCtrl = TextEditingController();

  String _frequency = 'daily';
  DateTime? _endDate;
  bool _isCreating = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _commitCtrl.dispose();
    _stakesCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickEndDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _endDate ?? DateTime.now().add(const Duration(days: 30)),
      firstDate: DateTime.now().add(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _endDate = picked);
  }

  String _fmtDate(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}'
        '-${dt.day.toString().padLeft(2, '0')}';
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_endDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select an end date.')),
      );
      return;
    }

    setState(() => _isCreating = true);

    try {
      await widget.service.create(
        userId: widget.userId,
        title: _titleCtrl.text.trim(),
        commitment: _commitCtrl.text.trim(),
        type: 'custom',
        stakes: _stakesCtrl.text.trim().isEmpty
            ? null
            : _stakesCtrl.text.trim(),
        checkInFrequency: _frequency,
        startDate: _fmtDate(DateTime.now()),
        endDate: _fmtDate(_endDate!),
      );
      if (!mounted) return;
      Navigator.pop(context);
      widget.onCreated();
    } catch (_) {
      if (!mounted) return;
      setState(() => _isCreating = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to create contract.')),
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
        child: SingleChildScrollView(
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
              Text('New contract',
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 16),
              TextFormField(
                controller: _titleCtrl,
                autofocus: true,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                  labelText: 'Title',
                  hintText: 'e.g. Morning workout every day',
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _commitCtrl,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                  labelText: 'Commitment',
                  hintText: 'What exactly are you committing to?',
                ),
                maxLines: 2,
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _stakesCtrl,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                  labelText: 'Stakes (optional)',
                  hintText: 'e.g. Donate \$20 to charity if missed',
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _frequency,
                      dropdownColor: AppColors.surfaceEl,
                      style: const TextStyle(color: AppColors.textPrimary),
                      decoration:
                          const InputDecoration(labelText: 'Frequency'),
                      items: const [
                        DropdownMenuItem(
                            value: 'daily', child: Text('Daily')),
                        DropdownMenuItem(
                            value: 'weekly', child: Text('Weekly')),
                      ],
                      onChanged: (v) =>
                          setState(() => _frequency = v ?? 'daily'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _pickEndDate,
                      icon: Icon(
                        Icons.event_rounded,
                        size: 16,
                        color: _endDate != null
                            ? AppColors.accent
                            : AppColors.textSecondary,
                      ),
                      label: Text(
                        _endDate != null ? _fmtDate(_endDate!) : 'End date',
                        style: TextStyle(
                          color: _endDate != null
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
                onPressed: _isCreating ? null : _submit,
                child: _isCreating
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Create contract'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
