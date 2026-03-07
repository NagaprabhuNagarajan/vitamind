import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/companion_service.dart';

const _starterPrompts = [
  'How am I doing lately?',
  "I'm feeling overwhelmed today",
  'Help me reflect on this week',
  'What should I focus on for my wellbeing?',
];

class CompanionScreen extends StatefulWidget {
  const CompanionScreen({super.key});

  @override
  State<CompanionScreen> createState() => _CompanionScreenState();
}

class _CompanionScreenState extends State<CompanionScreen> {
  final _service = CompanionService();
  final _messages = <CompanionMessage>[];
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  bool _loading = false;

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _send(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _loading) return;

    setState(() {
      _messages.add(CompanionMessage(role: 'user', content: trimmed, timestamp: DateTime.now()));
      _loading = true;
    });
    _inputCtrl.clear();
    _scrollToBottom();

    try {
      final history = _messages.sublist(0, _messages.length - 1);
      final reply = await _service.sendMessage(history, trimmed);
      setState(() => _messages.add(reply));
    } catch (_) {
      setState(() => _messages.add(CompanionMessage(
            role: 'assistant',
            content: "I'm here, but ran into an issue. Please try again.",
            timestamp: DateTime.now(),
          )));
    } finally {
      setState(() => _loading = false);
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        title: const Text('AI Life Companion', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 17)),
        actions: [
          if (_messages.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_outline_rounded, size: 20, color: AppColors.textTertiary),
              onPressed: () => setState(() => _messages.clear()),
              tooltip: 'Clear chat',
            ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _messages.isEmpty ? _buildEmpty() : _buildMessages(),
          ),
          _buildInput(),
        ],
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.secondary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.secondary.withValues(alpha: 0.25)),
              ),
              child: const Icon(Icons.favorite_outlined, color: AppColors.secondary, size: 28),
            ),
            const SizedBox(height: 16),
            const Text(
              'A warm companion who knows you and grows with you over time.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: _starterPrompts
                  .map((p) => GestureDetector(
                        onTap: () => _send(p),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceEl,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Text(p, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        ),
                      ))
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessages() {
    return ListView.builder(
      controller: _scrollCtrl,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      itemCount: _messages.length + (_loading ? 1 : 0),
      itemBuilder: (_, i) {
        if (i == _messages.length) return _buildTyping();
        return _buildBubble(_messages[i]);
      },
    );
  }

  Widget _buildBubble(CompanionMessage msg) {
    final isUser = msg.role == 'user';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser) ...[
            Container(
              width: 28, height: 28,
              decoration: BoxDecoration(
                color: AppColors.secondary.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.favorite_outlined, size: 14, color: AppColors.secondary),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isUser
                    ? AppColors.primary.withValues(alpha: 0.9)
                    : AppColors.secondary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isUser ? 16 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 16),
                ),
                border: isUser
                    ? null
                    : Border.all(color: AppColors.secondary.withValues(alpha: 0.2)),
              ),
              child: Text(
                msg.content,
                style: TextStyle(
                  fontSize: 14,
                  color: isUser ? Colors.white : AppColors.textPrimary,
                  height: 1.5,
                ),
              ),
            ),
          ),
          if (isUser) const SizedBox(width: 8),
        ],
      ),
    );
  }

  Widget _buildTyping() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 28, height: 28,
            decoration: BoxDecoration(
              color: AppColors.secondary.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.favorite_outlined, size: 14, color: AppColors.secondary),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.secondary.withValues(alpha: 0.08),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
                bottomRight: Radius.circular(16),
                bottomLeft: Radius.circular(4),
              ),
              border: Border.all(color: AppColors.secondary.withValues(alpha: 0.2)),
            ),
            child: const SizedBox(
              width: 36, height: 14,
              child: _TypingDots(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInput() {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      padding: EdgeInsets.fromLTRB(16, 10, 16, MediaQuery.of(context).padding.bottom + 10),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _inputCtrl,
              style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Share what\'s on your mind…',
                hintStyle: const TextStyle(color: AppColors.textTertiary, fontSize: 14),
                filled: true,
                fillColor: AppColors.surfaceEl,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: const BorderSide(color: AppColors.secondary, width: 1.5),
                ),
              ),
              onSubmitted: _send,
              textInputAction: TextInputAction.send,
              maxLines: 4,
              minLines: 1,
            ),
          ),
          const SizedBox(width: 8),
          ValueListenableBuilder<TextEditingValue>(
            valueListenable: _inputCtrl,
            builder: (_, value, __) {
              final canSend = value.text.trim().isNotEmpty && !_loading;
              return GestureDetector(
                onTap: canSend ? () => _send(_inputCtrl.text) : null,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  width: 42, height: 42,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: canSend
                        ? const LinearGradient(colors: [Color(0xFFA855F7), Color(0xFF7C3AED)])
                        : null,
                    color: canSend ? null : AppColors.surfaceEl,
                    border: Border.all(color: canSend ? Colors.transparent : AppColors.border),
                  ),
                  child: Icon(Icons.send_rounded, size: 18, color: canSend ? Colors.white : AppColors.textTertiary),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _TypingDots extends StatefulWidget {
  const _TypingDots();
  @override
  State<_TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<_TypingDots> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) => Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(3, (i) {
          final phase = (_ctrl.value * 3 - i).clamp(0.0, 1.0);
          final opacity = (phase < 0.5 ? phase * 2 : (1 - phase) * 2).clamp(0.3, 1.0);
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: Opacity(
              opacity: opacity,
              child: Container(
                width: 6, height: 6,
                decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.textTertiary),
              ),
            ),
          );
        }),
      ),
    );
  }
}
