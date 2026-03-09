import 'package:flutter/material.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/future_self_service.dart';

class FutureSelfScreen extends StatefulWidget {
  const FutureSelfScreen({super.key});

  @override
  State<FutureSelfScreen> createState() => _FutureSelfScreenState();
}

class _FutureSelfScreenState extends State<FutureSelfScreen> {
  final _service = FutureSelfService();
  final _msgCtrl = TextEditingController();

  List<FutureMessage> _messages = [];
  bool _loading = true;
  bool _sending = false;
  String? _sendError;
  DateTime _deliverAt = DateTime.now().add(const Duration(days: 30));
  String? _expandedId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _msgCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final msgs = await _service.getMessages();
      setState(() => _messages = msgs);
    } catch (_) {
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _send() async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty) return;
    setState(() { _sending = true; _sendError = null; });
    try {
      final deliverStr = _deliverAt.toIso8601String().split('T')[0];
      await _service.createMessage(text, deliverStr);
      _msgCtrl.clear();
      await _load();
    } catch (_) {
      setState(() => _sendError = 'Failed to seal message. Try again.');
    } finally {
      setState(() => _sending = false);
    }
  }

  Future<void> _delete(String id) async {
    try {
      await _service.deleteMessage(id);
      setState(() => _messages.removeWhere((m) => m.id == id));
    } catch (_) {}
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _deliverAt,
      firstDate: DateTime.now().add(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 3650)),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF6366F1),
            surface: Color(0xFF111827),
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _deliverAt = picked);
  }

  String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${months[d.month - 1]} ${d.day}, ${d.year}';
    } catch (_) {
      return iso;
    }
  }

  @override
  Widget build(BuildContext context) {
    final arrived = _messages.where((m) => m.isPast || m.delivered).toList();
    final sealed = _messages.where((m) => !m.isPast && !m.delivered).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF060810),
      appBar: AppBar(
        backgroundColor: const Color(0xFF060810),
        title: const Text('Future Self', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [IconButton(icon: const Icon(Icons.refresh, size: 20), onPressed: _load)],
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Compose card
                  _card(child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(children: [
                        Icon(Icons.hourglass_bottom_outlined, color: Color(0xFFA855F7), size: 16),
                        SizedBox(width: 6),
                        Text('Write to Your Future Self', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
                      ]),
                      const SizedBox(height: 4),
                      const Text(
                        'Seal a message to be opened on a future date. AI will generate a behavioral forecast.',
                        style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 11),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _msgCtrl,
                        maxLines: 4,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'Dear future me, by now I hope...',
                          hintStyle: const TextStyle(color: Color(0xFF4B5563), fontSize: 12),
                          filled: true,
                          fillColor: Colors.white.withValues(alpha: 0.04),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Color(0xFF6366F1)),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      // Deliver date row
                      GestureDetector(
                        onTap: _pickDate,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.04),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                          ),
                          child: Row(children: [
                            const Icon(Icons.calendar_today_outlined, size: 14, color: Color(0xFF818CF8)),
                            const SizedBox(width: 8),
                            Text(
                              'Deliver on: ${_formatDate(_deliverAt.toIso8601String())}',
                              style: const TextStyle(color: Colors.white, fontSize: 13),
                            ),
                            const Spacer(),
                            const Icon(Icons.edit_outlined, size: 13, color: Color(0xFF6B7280)),
                          ]),
                        ),
                      ),
                      if (_sendError != null) ...[
                        const SizedBox(height: 8),
                        Text(_sendError!, style: const TextStyle(color: Color(0xFFEF4444), fontSize: 12)),
                      ],
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _sending ? null : _send,
                          icon: _sending
                              ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                              : const Icon(Icons.lock_outlined, size: 16),
                          label: Text(_sending ? 'Sealing…' : 'Seal & Send'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFA855F7),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                    ],
                  )),

                  const SizedBox(height: 20),

                  // Arrived messages
                  if (arrived.isNotEmpty) ...[
                    _sectionLabel('Arrived (${arrived.length})'),
                    const SizedBox(height: 8),
                    ...arrived.map((m) => _arrivedTile(m)),
                    const SizedBox(height: 16),
                  ],

                  // Sealed messages
                  _sectionLabel(sealed.isEmpty ? 'Sealed Messages' : 'Sealed (${sealed.length})'),
                  const SizedBox(height: 8),
                  if (sealed.isEmpty)
                    _card(child: const Text(
                      'No sealed messages yet. Write one above.',
                      style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
                    ))
                  else
                    ...sealed.map((m) => _sealedTile(m)),

                  const SizedBox(height: 80),
                ],
              ),
            ),
    );
  }

  Widget _arrivedTile(FutureMessage m) {
    final expanded = _expandedId == m.id;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFA855F7).withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            onTap: () => setState(() => _expandedId = expanded ? null : m.id),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(children: [
                const Icon(Icons.mail_outline_rounded, color: Color(0xFFC084FC), size: 16),
                const SizedBox(width: 8),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('From Past You', style: TextStyle(color: Color(0xFFC084FC), fontSize: 11, fontWeight: FontWeight.w600)),
                  Text('Written on ${_formatDate(m.createdAt)}', style: const TextStyle(color: Color(0xFF6B7280), fontSize: 10)),
                ])),
                Icon(expanded ? Icons.expand_less : Icons.expand_more, color: const Color(0xFF6B7280), size: 18),
                IconButton(
                  icon: const Icon(Icons.delete_outline, size: 16, color: Color(0xFF6B7280)),
                  onPressed: () => _delete(m.id),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                ),
              ]),
            ),
          ),
          if (expanded) ...[
            const Divider(color: Color(0xFF1F2937), height: 1),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(m.message, style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.5)),
                if (m.aiForecast != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFA855F7).withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFA855F7).withValues(alpha: 0.2)),
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Row(children: [
                        Icon(Icons.auto_awesome, size: 12, color: Color(0xFFC084FC)),
                        SizedBox(width: 4),
                        Text('AI Forecast at Time of Writing', style: TextStyle(color: Color(0xFFC084FC), fontSize: 10, fontWeight: FontWeight.w600)),
                      ]),
                      const SizedBox(height: 6),
                      Text(m.aiForecast!, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12, height: 1.4)),
                    ]),
                  ),
                ],
              ]),
            ),
          ],
        ],
      ),
    );
  }

  Widget _sealedTile(FutureMessage m) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF111827),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Row(children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFF6366F1).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.lock_outline_rounded, size: 16, color: Color(0xFF818CF8)),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(
              m.message.length > 60 ? '${m.message.substring(0, 60)}…' : m.message,
              style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
            ),
            const SizedBox(height: 2),
            Row(children: [
              const Icon(Icons.schedule_outlined, size: 11, color: Color(0xFF6B7280)),
              const SizedBox(width: 4),
              Text(
                'Opens ${_formatDate(m.deliverAt)}  ·  ${m.daysUntil}d left',
                style: const TextStyle(color: Color(0xFF6B7280), fontSize: 10),
              ),
            ]),
          ])),
          IconButton(
            icon: const Icon(Icons.delete_outline, size: 16, color: Color(0xFF6B7280)),
            onPressed: () => _delete(m.id),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
          ),
        ]),
      );

  Widget _card({required Widget child}) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF111827),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: child,
      );

  Widget _sectionLabel(String text) => Text(text.toUpperCase(),
      style: const TextStyle(color: Color(0xFF6B7280), fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w600));
}
