import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/voice_log_service.dart';

class VoiceLogScreen extends StatefulWidget {
  const VoiceLogScreen({super.key});

  @override
  State<VoiceLogScreen> createState() => _VoiceLogScreenState();
}

class _VoiceLogScreenState extends State<VoiceLogScreen>
    with SingleTickerProviderStateMixin {
  final _service = VoiceLogService();
  final _controller = TextEditingController();
  final _speech = stt.SpeechToText();

  late final String _userId;
  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnim;

  bool _isProcessing = false;
  bool _isListening = false;
  bool _speechAvailable = false;
  bool _isLoading = true;
  VoiceLog? _lastResult;
  List<VoiceLog> _recentLogs = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _userId = Supabase.instance.client.auth.currentUser!.id;

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _pulseAnim = Tween<double>(begin: 1.0, end: 1.18).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _initSpeech();
    _loadRecentLogs();
  }

  Future<void> _initSpeech() async {
    _speechAvailable = await _speech.initialize(
      onError: (error) {
        if (!mounted) return;
        setState(() {
          _isListening = false;
          _error = 'Speech error: ${error.errorMsg}';
        });
        _pulseController.stop();
        _pulseController.reset();
      },
      onStatus: (status) {
        if (status == 'done' || status == 'notListening') {
          if (!mounted) return;
          setState(() => _isListening = false);
          _pulseController.stop();
          _pulseController.reset();
        }
      },
    );
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _controller.dispose();
    _pulseController.dispose();
    if (_isListening) _speech.stop();
    super.dispose();
  }

  Future<void> _toggleListening() async {
    if (_isListening) {
      await _speech.stop();
      setState(() => _isListening = false);
      _pulseController.stop();
      _pulseController.reset();
      return;
    }

    if (!_speechAvailable) {
      setState(() => _error = 'Speech recognition is not available on this device.');
      return;
    }

    setState(() {
      _isListening = true;
      _error = null;
    });
    _pulseController.repeat(reverse: true);

    await _speech.listen(
      onResult: (result) {
        if (!mounted) return;
        setState(() {
          _controller.text = result.recognizedWords;
          _controller.selection = TextSelection.fromPosition(
            TextPosition(offset: _controller.text.length),
          );
        });
      },
      listenFor: const Duration(seconds: 30),
      pauseFor: const Duration(seconds: 3),
      localeId: 'en_US',
    );
  }

  Future<void> _loadRecentLogs() async {
    try {
      final logs = await _service.fetchRecent(_userId, limit: 10);
      if (!mounted) return;
      setState(() {
        _recentLogs = logs;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load recent logs.';
        _isLoading = false;
      });
    }
  }

  Future<void> _processTranscript() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    if (_isListening) {
      await _speech.stop();
      setState(() => _isListening = false);
    }

    setState(() {
      _isProcessing = true;
      _error = null;
      _lastResult = null;
    });
    _pulseController.repeat(reverse: true);

    try {
      final result = await _service.submitLog(_userId, text);
      if (!mounted) return;

      _controller.clear();
      setState(() {
        _lastResult = result;
        _isProcessing = false;
        // Prepend the new log to the recent list
        _recentLogs.insert(0, result);
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Processing failed. Please try again.';
        _isProcessing = false;
      });
    } finally {
      _pulseController.stop();
      _pulseController.reset();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(title: const Text('Voice Log')),
      body: SafeArea(
        child: Column(
          children: [
            _buildInputSection(),
            if (_error != null) _buildError(),
            if (_lastResult != null) _buildResultCard(),
            const SizedBox(height: 8),
            _buildRecentHeader(),
            Expanded(child: _buildRecentList()),
          ],
        ),
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }

  Widget _buildInputSection() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: GlassCard(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Tap mic to start/stop voice recording
            GestureDetector(
              onTap: _isProcessing ? null : _toggleListening,
              child: AnimatedBuilder(
                animation: _pulseAnim,
                builder: (context, child) => Transform.scale(
                  scale: (_isProcessing || _isListening) ? _pulseAnim.value : 1.0,
                  child: child,
                ),
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: _isListening
                          ? [AppColors.error, AppColors.secondary]
                          : _isProcessing
                              ? [AppColors.accent, AppColors.secondary]
                              : [
                                  AppColors.primary.withValues(alpha: 0.25),
                                  AppColors.secondary.withValues(alpha: 0.25),
                                ],
                    ),
                  ),
                  child: Icon(
                    _isListening ? Icons.stop_rounded : Icons.mic_rounded,
                    size: 32,
                    color: (_isProcessing || _isListening)
                        ? Colors.white
                        : AppColors.textSecondary,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _isListening
                  ? 'Listening... Tap to stop'
                  : _isProcessing
                      ? 'Processing your input...'
                      : 'Tap the mic or type below',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _controller,
              maxLines: 3,
              minLines: 2,
              enabled: !_isProcessing,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: InputDecoration(
                hintText:
                    'e.g. "Finished the report, did my morning run, '
                    'add buy groceries to tasks"',
                suffixIcon: IconButton(
                  icon: Icon(
                    _isListening ? Icons.mic_rounded : Icons.mic_none_rounded,
                    color: _isListening ? AppColors.error : AppColors.textTertiary,
                  ),
                  tooltip: _isListening ? 'Stop listening' : 'Start voice input',
                  onPressed: _isProcessing ? null : _toggleListening,
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isProcessing ? null : _processTranscript,
                icon: _isProcessing
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.send_rounded, size: 18),
                label: Text(_isProcessing ? 'Processing' : 'Process'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: GlassCard(
        padding: const EdgeInsets.all(12),
        borderColor: AppColors.error.withValues(alpha: 0.3),
        color: AppColors.error.withValues(alpha: 0.06),
        child: Row(
          children: [
            const Icon(Icons.error_outline, size: 18, color: AppColors.error),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                _error!,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.error,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultCard() {
    final log = _lastResult!;
    // Parse actions from the server response (JSON map with action lists)
    final actions = log.actions;
    final actionEntries = <MapEntry<String, dynamic>>[];
    if (actions != null) {
      actionEntries.addAll(actions.entries);
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: GlassCard(
        padding: const EdgeInsets.all(16),
        borderColor: AppColors.success.withValues(alpha: 0.3),
        color: AppColors.success.withValues(alpha: 0.06),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppColors.success.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.check_circle_outline,
                      size: 16, color: AppColors.success),
                ),
                const SizedBox(width: 8),
                Text(
                  'Actions taken',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: AppColors.success,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (actionEntries.isEmpty)
              Text(
                'Log saved. AI actions will be processed shortly.',
                style: Theme.of(context).textTheme.bodyMedium,
              )
            else
              ...actionEntries.map((entry) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          _actionIcon(entry.key),
                          size: 14,
                          color: AppColors.accent,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '${_actionLabel(entry.key)}: ${entry.value}',
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  )),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          Text(
            'Recent logs',
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: AppColors.textSecondary,
                ),
          ),
          const Spacer(),
          if (_recentLogs.isNotEmpty)
            Text(
              '${_recentLogs.length} entries',
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.textTertiary,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildRecentList() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.accent),
      );
    }

    if (_recentLogs.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.mic_off_rounded,
                size: 40, color: AppColors.textTertiary),
            const SizedBox(height: 12),
            Text(
              'No voice logs yet.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      itemCount: _recentLogs.length,
      itemBuilder: (context, index) {
        final log = _recentLogs[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: GlassCard(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.mic_rounded,
                        size: 14, color: AppColors.secondary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _formatDate(log.createdAt),
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.textTertiary,
                        ),
                      ),
                    ),
                    if (log.actions != null)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.success.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '${log.actions!.length} actions',
                          style: const TextStyle(
                            fontSize: 10,
                            color: AppColors.success,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  log.transcript,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // -- Helpers ---------------------------------------------------------------

  IconData _actionIcon(String type) {
    switch (type) {
      case 'tasks_created':
        return Icons.add_task_rounded;
      case 'tasks_completed':
        return Icons.task_alt_rounded;
      case 'habits_logged':
        return Icons.loop_rounded;
      default:
        return Icons.auto_awesome;
    }
  }

  String _actionLabel(String type) {
    switch (type) {
      case 'tasks_created':
        return 'Created';
      case 'tasks_completed':
        return 'Completed';
      case 'habits_logged':
        return 'Logged';
      default:
        return type;
    }
  }

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}
