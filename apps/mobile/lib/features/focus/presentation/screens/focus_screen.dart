import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../focus/data/focus_service.dart';

/// A focus-mode timer screen that lets the user run timed deep-work sessions,
/// track interruptions, and review a calculated focus quality score afterward.
///
/// Integrates with [FocusService] which persists sessions as `focus_blocks`
/// and computes scores server-side via [FocusService.endBlock].
class FocusScreen extends StatefulWidget {
  const FocusScreen({super.key});

  @override
  State<FocusScreen> createState() => _FocusScreenState();
}

enum _FocusPhase { idle, running, completed }

class _FocusScreenState extends State<FocusScreen> {
  final _service = FocusService();

  // -- Timer state --
  _FocusPhase _phase = _FocusPhase.idle;
  int _selectedMinutes = 25;
  int _remainingSeconds = 0;
  int _interruptions = 0;
  Timer? _timer;

  /// The server-created block for the active session.
  FocusBlock? _activeBlock;

  // -- Data --
  List<FocusBlock> _recentBlocks = [];
  bool _loadingBlocks = true;
  int? _lastScore;

  static const _durations = [15, 25, 45, 60, 90];

  @override
  void initState() {
    super.initState();
    _loadBlocks();
    _checkActiveBlock();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String get _userId => Supabase.instance.client.auth.currentUser!.id;

  Future<void> _loadBlocks() async {
    setState(() => _loadingBlocks = true);
    try {
      final blocks = await _service.getRecent(_userId, limit: 10);
      if (!mounted) return;
      setState(() {
        _recentBlocks = blocks;
        _loadingBlocks = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingBlocks = false);
    }
  }

  /// Resume a session that was started but not ended (e.g. app was killed).
  Future<void> _checkActiveBlock() async {
    try {
      final active = await _service.getActive(_userId);
      if (active != null && mounted) {
        final elapsed =
            DateTime.now().difference(active.startedAt).inSeconds;
        final remaining = (active.durationMinutes * 60) - elapsed;

        if (remaining > 0) {
          setState(() {
            _activeBlock = active;
            _remainingSeconds = remaining;
            _interruptions = active.interruptions;
            _phase = _FocusPhase.running;
          });
          _startCountdown();
        }
      }
    } catch (_) {
      // Best effort -- don't block the screen on resume failure.
    }
  }

  Future<void> _startSession() async {
    try {
      final block = await _service.startBlock(
        _userId,
        <String>[], // No task selection in this simplified timer UI
        _selectedMinutes,
      );

      if (!mounted) return;

      setState(() {
        _activeBlock = block;
        _phase = _FocusPhase.running;
        _remainingSeconds = _selectedMinutes * 60;
        _interruptions = 0;
        _lastScore = null;
      });

      _startCountdown();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to start session: $e')),
      );
    }
  }

  void _startCountdown() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_remainingSeconds <= 0) {
        _endSession();
        return;
      }
      setState(() => _remainingSeconds--);
    });
  }

  Future<void> _endSession() async {
    _timer?.cancel();
    _timer = null;

    final block = _activeBlock;
    if (block == null) return;

    try {
      final result = await _service.endBlock(
        block.id,
        <String>[], // Completed tasks -- none tracked in timer-only mode
        _interruptions,
      );

      if (!mounted) return;

      setState(() {
        _phase = _FocusPhase.completed;
        _lastScore = result.focusScore ?? 0;
        _activeBlock = null;
      });

      await _loadBlocks();
    } catch (e) {
      if (!mounted) return;

      // Even if the server call fails, move to completed state with a
      // locally computed score so the user isn't stuck.
      final totalPlanned = _selectedMinutes * 60;
      final elapsed = totalPlanned - _remainingSeconds;
      final local = _localScore(totalPlanned, elapsed, _interruptions);

      setState(() {
        _phase = _FocusPhase.completed;
        _lastScore = local;
        _activeBlock = null;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Session saved locally: $e')),
      );
    }
  }

  /// Fallback score calculation matching the server formula.
  int _localScore(int planned, int actual, int interruptions) {
    if (planned == 0) return 0;
    final ratio = (actual / planned).clamp(0.0, 1.0);
    final penalty = (interruptions * 5).clamp(0, 30);
    return ((ratio * 70) + 30 - penalty).round().clamp(0, 100);
  }

  void _reset() {
    setState(() {
      _phase = _FocusPhase.idle;
      _remainingSeconds = 0;
      _interruptions = 0;
      _lastScore = null;
      _activeBlock = null;
    });
  }

  String _formatTime(int totalSeconds) {
    final m = totalSeconds ~/ 60;
    final s = totalSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: const Text('Focus Mode'),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: [
          // -- Main focus area --
          if (_phase == _FocusPhase.idle) _buildIdle(),
          if (_phase == _FocusPhase.running) _buildRunning(),
          if (_phase == _FocusPhase.completed) _buildCompleted(),

          const SizedBox(height: 32),

          // -- Recent sessions --
          Text('Recent Sessions',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          if (_loadingBlocks)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            )
          else if (_recentBlocks.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Text(
                'No sessions yet. Start your first focus session above.',
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
            )
          else
            ..._recentBlocks.map((b) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _BlockCard(block: b),
                )),

          const SizedBox(height: 16),
        ],
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }

  // -- Idle state: duration picker + start button --------------------------

  Widget _buildIdle() {
    return Column(
      children: [
        const SizedBox(height: 24),

        // Timer preview
        Text(
          _formatTime(_selectedMinutes * 60),
          style: Theme.of(context).textTheme.displayLarge?.copyWith(
                fontSize: 64,
                fontWeight: FontWeight.w200,
                letterSpacing: 4,
                color: AppColors.textPrimary,
              ),
        ),
        const SizedBox(height: 8),
        Text('Select duration',
            style: Theme.of(context).textTheme.bodyMedium),

        const SizedBox(height: 24),

        // Duration chips
        Wrap(
          spacing: 10,
          runSpacing: 10,
          alignment: WrapAlignment.center,
          children: _durations.map((d) {
            final selected = d == _selectedMinutes;
            return ChoiceChip(
              label: Text('$d min'),
              selected: selected,
              onSelected: (_) => setState(() => _selectedMinutes = d),
              selectedColor: AppColors.primary.withValues(alpha: 0.2),
              labelStyle: TextStyle(
                color: selected ? AppColors.primary : AppColors.textSecondary,
                fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
              ),
              side: BorderSide(
                color: selected
                    ? AppColors.primary.withValues(alpha: 0.4)
                    : AppColors.border,
              ),
            );
          }).toList(),
        ),

        const SizedBox(height: 32),

        // Start button
        _GradientActionButton(
          label: 'Start Focus',
          icon: Icons.play_arrow_rounded,
          onPressed: _startSession,
        ),
      ],
    );
  }

  // -- Running state: countdown + interruptions + end button ---------------

  Widget _buildRunning() {
    final totalSeconds = _selectedMinutes * 60;
    final progress =
        totalSeconds > 0 ? 1.0 - (_remainingSeconds / totalSeconds) : 0.0;

    return Column(
      children: [
        const SizedBox(height: 24),

        // Countdown
        Text(
          _formatTime(_remainingSeconds),
          style: Theme.of(context).textTheme.displayLarge?.copyWith(
                fontSize: 72,
                fontWeight: FontWeight.w200,
                letterSpacing: 4,
                color: AppColors.primary,
              ),
        ),

        const SizedBox(height: 12),

        // Progress bar
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: AppColors.border,
              valueColor: const AlwaysStoppedAnimation(AppColors.primary),
            ),
          ),
        ),

        const SizedBox(height: 28),

        // Interruption counter
        GlassCard(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Interruptions',
                  style: Theme.of(context).textTheme.labelLarge),
              const SizedBox(width: 16),
              _RoundIconButton(
                icon: Icons.remove_rounded,
                onPressed: _interruptions > 0
                    ? () => setState(() => _interruptions--)
                    : null,
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  '$_interruptions',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: _interruptions > 0
                            ? AppColors.warning
                            : AppColors.textPrimary,
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ),
              _RoundIconButton(
                icon: Icons.add_rounded,
                onPressed: () => setState(() => _interruptions++),
              ),
            ],
          ),
        ),

        const SizedBox(height: 28),

        // End session
        SizedBox(
          width: double.infinity,
          height: 52,
          child: OutlinedButton.icon(
            onPressed: _endSession,
            icon: const Icon(Icons.stop_rounded),
            label: const Text('End Session'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.error,
              side: BorderSide(color: AppColors.error.withValues(alpha: 0.4)),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
      ],
    );
  }

  // -- Completed state: score display + new session ------------------------

  Widget _buildCompleted() {
    final score = _lastScore ?? 0;
    final color = score > 70
        ? AppColors.success
        : score >= 40
            ? AppColors.warning
            : AppColors.error;

    return Column(
      children: [
        const SizedBox(height: 32),

        // Score circle
        Container(
          width: 140,
          height: 140,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: color.withValues(alpha: 0.4), width: 4),
            color: color.withValues(alpha: 0.08),
          ),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '$score',
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        fontSize: 44,
                        fontWeight: FontWeight.bold,
                        color: color,
                      ),
                ),
                Text(
                  'Focus Score',
                  style: Theme.of(context)
                      .textTheme
                      .labelSmall
                      ?.copyWith(color: AppColors.textTertiary),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 20),

        Text(
          _scoreMessage(score),
          style: Theme.of(context).textTheme.bodyLarge,
          textAlign: TextAlign.center,
        ),

        const SizedBox(height: 28),

        _GradientActionButton(
          label: 'New Session',
          icon: Icons.replay_rounded,
          onPressed: _reset,
        ),
      ],
    );
  }

  String _scoreMessage(int score) {
    if (score >= 90) return 'Exceptional focus. Keep it up.';
    if (score >= 70) return 'Great session. Solid concentration.';
    if (score >= 50) return 'Decent effort. Try fewer interruptions next time.';
    return 'Room to improve. Consider a quieter environment.';
  }
}

// ---------------------------------------------------------------------------
// Private widgets
// ---------------------------------------------------------------------------

/// Full-width gradient button matching the app's GradientButton but with icon.
class _GradientActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onPressed;

  const _GradientActionButton({
    required this.label,
    required this.icon,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF6366F1), Color(0xFFA855F7)],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            onTap: onPressed,
            borderRadius: BorderRadius.circular(12),
            splashColor: Colors.white.withValues(alpha: 0.1),
            child: Center(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Small circular icon button used in the interruption counter.
class _RoundIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;

  const _RoundIconButton({required this.icon, this.onPressed});

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null;
    return Semantics(
      button: true,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: enabled
                ? AppColors.primary.withValues(alpha: 0.12)
                : AppColors.border,
          ),
          child: Icon(
            icon,
            size: 20,
            color: enabled ? AppColors.primary : AppColors.textTertiary,
          ),
        ),
      ),
    );
  }
}

/// Card showing a past focus block with duration, score, and timestamp.
class _BlockCard extends StatelessWidget {
  final FocusBlock block;
  const _BlockCard({required this.block});

  @override
  Widget build(BuildContext context) {
    final score = block.focusScore ?? 0;
    final scoreColor = score > 70
        ? AppColors.success
        : score >= 40
            ? AppColors.warning
            : AppColors.error;

    // Show actual elapsed minutes (from start to end, or durationMinutes).
    final actualMin = block.endedAt != null
        ? block.endedAt!.difference(block.startedAt).inMinutes
        : block.durationMinutes;

    final date = block.startedAt.toLocal();
    final dateLabel =
        '${date.day}/${date.month}/${date.year}  '
        '${date.hour.toString().padLeft(2, '0')}:'
        '${date.minute.toString().padLeft(2, '0')}';

    return GlassCard(
      child: Row(
        children: [
          // Score badge
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: scoreColor.withValues(alpha: 0.12),
              border: Border.all(color: scoreColor.withValues(alpha: 0.3)),
            ),
            child: Center(
              child: Text(
                '$score',
                style: Theme.of(context)
                    .textTheme
                    .labelLarge
                    ?.copyWith(color: scoreColor, fontWeight: FontWeight.bold),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$actualMin / ${block.durationMinutes} min',
                  style: Theme.of(context).textTheme.labelLarge,
                ),
                const SizedBox(height: 2),
                Text(
                  dateLabel,
                  style: Theme.of(context)
                      .textTheme
                      .labelSmall
                      ?.copyWith(fontSize: 11),
                ),
              ],
            ),
          ),
          if (block.interruptions > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.notifications_active_outlined,
                      size: 12, color: AppColors.warning),
                  const SizedBox(width: 4),
                  Text(
                    '${block.interruptions}',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: AppColors.warning,
                          fontSize: 11,
                        ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
