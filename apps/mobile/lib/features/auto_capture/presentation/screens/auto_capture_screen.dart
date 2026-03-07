import 'package:flutter/material.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/auto_capture_service.dart';

class AutoCaptureScreen extends StatefulWidget {
  const AutoCaptureScreen({super.key});

  @override
  State<AutoCaptureScreen> createState() => _AutoCaptureScreenState();
}

class _AutoCaptureScreenState extends State<AutoCaptureScreen> {
  final _service = AutoCaptureService();
  final _textCtrl = TextEditingController();

  List<CaptureSuggestion> _suggestions = [];
  bool _loadingSuggestions = true;
  final Set<String> _imported = {};
  String? _importingId;

  bool _quickLoading = false;
  QuickLogResult? _quickResult;
  String? _quickError;

  @override
  void initState() {
    super.initState();
    _loadSuggestions();
  }

  @override
  void dispose() {
    _textCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadSuggestions() async {
    setState(() { _loadingSuggestions = true; });
    try {
      final s = await _service.getSuggestions();
      setState(() => _suggestions = s);
    } catch (_) {
      // silent
    } finally {
      setState(() => _loadingSuggestions = false);
    }
  }

  Future<void> _import(CaptureSuggestion s) async {
    setState(() => _importingId = s.id);
    try {
      await _service.importSuggestion(s);
      setState(() => _imported.add(s.id));
    } catch (_) {
      // silent
    } finally {
      setState(() => _importingId = null);
    }
  }

  Future<void> _quickLog() async {
    final text = _textCtrl.text.trim();
    if (text.isEmpty) return;
    setState(() { _quickLoading = true; _quickError = null; _quickResult = null; });
    try {
      final r = await _service.quickLog(text);
      setState(() { _quickResult = r; });
      _textCtrl.clear();
    } catch (e) {
      setState(() => _quickError = e.toString());
    } finally {
      setState(() => _quickLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF060810),
      appBar: AppBar(
        backgroundColor: const Color(0xFF060810),
        title: const Text('Auto Capture', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(icon: const Icon(Icons.refresh, size: 20), onPressed: _loadSuggestions),
        ],
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Quick Log
            _card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.bolt, color: Color(0xFFFBBF24), size: 16),
                      SizedBox(width: 6),
                      Text('Quick Log', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Type anything in plain English — tasks, habits, health data.',
                    style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _textCtrl,
                    maxLines: 3,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'e.g. Meditated 20 mins, slept 7.5h, review report by Friday',
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
                  if (_quickError != null) ...[
                    const SizedBox(height: 8),
                    Text(_quickError!, style: const TextStyle(color: Color(0xFFEF4444), fontSize: 12)),
                  ],
                  if (_quickResult != null) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF22C55E).withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFF22C55E).withValues(alpha: 0.2)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Logged successfully', style: TextStyle(color: Color(0xFF22C55E), fontSize: 12, fontWeight: FontWeight.w600)),
                          ..._quickResult!.actionsTaken.map((a) => Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Row(
                              children: [
                                const Icon(Icons.check_circle, color: Color(0xFF22C55E), size: 13),
                                const SizedBox(width: 6),
                                Expanded(child: Text(a, style: const TextStyle(color: Color(0xFFD1D5DB), fontSize: 12))),
                              ],
                            ),
                          )),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _quickLoading ? null : _quickLog,
                      icon: _quickLoading
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.bolt, size: 16),
                      label: Text(_quickLoading ? 'Parsing…' : 'Log It'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),
            const Text('SMART SUGGESTIONS',
                style: TextStyle(color: Color(0xFF6B7280), fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),

            if (_loadingSuggestions)
              const Center(child: Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(color: Color(0xFF6366F1)),
              ))
            else if (_suggestions.isEmpty)
              _card(child: const Text(
                'No suggestions right now. Connect Google Calendar or log more habits.',
                style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
              ))
            else
              ..._suggestions.map((s) => _suggestionTile(s)),

            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  Widget _suggestionTile(CaptureSuggestion s) {
    final done = _imported.contains(s.id);
    final isImporting = _importingId == s.id;
    final color = s.source == 'calendar' ? const Color(0xFF6366F1) : const Color(0xFFA855F7);

    return Opacity(
      opacity: done ? 0.5 : 1.0,
      child: Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Row(
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
            child: Icon(
              s.source == 'calendar' ? Icons.calendar_today : Icons.trending_up,
              color: color, size: 16,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _badge(s.type.toUpperCase(), const Color(0xFF4B5563)),
                    const SizedBox(width: 4),
                    Text('${s.confidence}%', style: const TextStyle(color: Color(0xFF6B7280), fontSize: 10)),
                  ],
                ),
                const SizedBox(height: 2),
                Text(s.title, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
                    overflow: TextOverflow.ellipsis),
                if (s.dueDate != null)
                  Text('Due ${s.dueDate}${s.dueTime != null ? " at ${s.dueTime}" : ""}',
                      style: const TextStyle(color: Color(0xFF6B7280), fontSize: 11)),
              ],
            ),
          ),
          if (s.type == 'task') ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: done || isImporting ? null : () => _import(s),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.04),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                ),
                child: isImporting
                    ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : done
                        ? const Icon(Icons.check_circle, color: Color(0xFF22C55E), size: 16)
                        : const Icon(Icons.add, color: Colors.white, size: 16),
              ),
            ),
          ],
        ],
      ),
    ),
    );
  }

  Widget _card({required Widget child, EdgeInsets? margin}) => Container(
        margin: margin,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF111827),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: child,
      );

  Widget _badge(String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(4)),
        child: Text(text, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w600)),
      );
}
