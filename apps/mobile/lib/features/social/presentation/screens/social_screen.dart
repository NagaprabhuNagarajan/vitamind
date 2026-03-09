import 'package:flutter/material.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/social_service.dart';

class SocialScreen extends StatefulWidget {
  const SocialScreen({super.key});

  @override
  State<SocialScreen> createState() => _SocialScreenState();
}

class _SocialScreenState extends State<SocialScreen> {
  final _service = SocialService();
  final _emailCtrl = TextEditingController();

  List<SocialConnection> _connections = [];
  List<FriendActivity> _feed = [];
  bool _loadingConns = true;
  bool _loadingFeed = true;
  bool _inviting = false;
  String? _inviteResult;
  bool _inviteOk = false;
  String? _actionId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    _loadConnections();
    _loadFeed();
  }

  Future<void> _loadConnections() async {
    setState(() => _loadingConns = true);
    try {
      final c = await _service.getConnections();
      setState(() => _connections = c);
    } catch (_) {
    } finally {
      setState(() => _loadingConns = false);
    }
  }

  Future<void> _loadFeed() async {
    setState(() => _loadingFeed = true);
    try {
      final f = await _service.getFeed();
      setState(() => _feed = f);
    } catch (_) {
    } finally {
      setState(() => _loadingFeed = false);
    }
  }

  Future<void> _sendInvite() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty) return;
    setState(() { _inviting = true; _inviteResult = null; });
    try {
      final r = await _service.sendInvite(email);
      setState(() { _inviteOk = r.ok; _inviteResult = r.message; });
      if (r.ok) { _emailCtrl.clear(); _loadConnections(); }
    } catch (_) {
      setState(() { _inviteOk = false; _inviteResult = 'Failed to send invite'; });
    } finally {
      setState(() => _inviting = false);
    }
  }

  Future<void> _acceptInvite(String id) async {
    setState(() => _actionId = id);
    try {
      await _service.acceptInvite(id);
      await _load();
    } catch (_) {
    } finally {
      setState(() => _actionId = null);
    }
  }

  Future<void> _remove(String id) async {
    setState(() => _actionId = id);
    try {
      await _service.removeConnection(id);
      setState(() {
        _connections.removeWhere((c) => c.id == id);
      });
    } catch (_) {
    } finally {
      setState(() => _actionId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final incoming = _connections.where((c) => c.status == 'pending' && c.direction == 'incoming').toList();
    final accepted = _connections.where((c) => c.status == 'accepted').toList();
    final outgoing = _connections.where((c) => c.status == 'pending' && c.direction == 'outgoing').toList();

    return Scaffold(
      backgroundColor: const Color(0xFF060810),
      appBar: AppBar(
        backgroundColor: const Color(0xFF060810),
        title: const Text('Social', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [IconButton(icon: const Icon(Icons.refresh, size: 20), onPressed: _load)],
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Invite card
            _card(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(children: [
                  Icon(Icons.person_add_outlined, color: Color(0xFF818CF8), size: 16),
                  SizedBox(width: 6),
                  Text('Add Friend', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
                ]),
                const SizedBox(height: 12),
                TextField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'friend@email.com',
                    hintStyle: const TextStyle(color: Color(0xFF4B5563), fontSize: 12),
                    filled: true,
                    fillColor: Colors.white.withValues(alpha: 0.04),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.08))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.08))),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF6366F1))),
                  ),
                ),
                if (_inviteResult != null) ...[
                  const SizedBox(height: 8),
                  Text(_inviteResult!, style: TextStyle(color: _inviteOk ? const Color(0xFF22C55E) : const Color(0xFFEF4444), fontSize: 12)),
                ],
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _inviting ? null : _sendInvite,
                    icon: _inviting
                        ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.send, size: 16),
                    label: Text(_inviting ? 'Sending…' : 'Send Invite'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6366F1),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ],
            )),

            const SizedBox(height: 20),

            // Incoming
            if (incoming.isNotEmpty) ...[
              _sectionLabel('Friend Requests (${incoming.length})'),
              const SizedBox(height: 8),
              ...incoming.map((c) => _connectionTile(c, showAccept: true)),
              const SizedBox(height: 16),
            ],

            // Feed
            _sectionLabel("Friends Today"),
            const SizedBox(height: 8),
            if (_loadingFeed)
              const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator(color: Color(0xFF6366F1))))
            else if (_feed.isEmpty)
              _card(child: Text(
                accepted.isEmpty ? 'Add friends to see their progress here.' : 'No friend activity yet today.',
                style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
              ))
            else
              ..._feed.map((f) => _activityTile(f)),

            const SizedBox(height: 20),

            // Accepted friends
            if (accepted.isNotEmpty) ...[
              _sectionLabel('Friends (${accepted.length})'),
              const SizedBox(height: 8),
              ...accepted.map((c) => _connectionTile(c)),
              const SizedBox(height: 16),
            ],

            // Sent invites
            if (outgoing.isNotEmpty) ...[
              _sectionLabel('Sent Invites'),
              const SizedBox(height: 8),
              ...outgoing.map((c) => Opacity(opacity: 0.6, child: _connectionTile(c))),
            ],

            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  Widget _connectionTile(SocialConnection c, {bool showAccept = false}) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF111827),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: const Color(0xFF6366F1).withValues(alpha: 0.2),
              child: Text(
                c.friendName.isNotEmpty ? c.friendName[0].toUpperCase() : '?',
                style: const TextStyle(color: Color(0xFF818CF8), fontSize: 14, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(c.friendName, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500)),
              Text(c.friendEmail, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 11), overflow: TextOverflow.ellipsis),
              if (!showAccept && c.status == 'pending')
                const Text('Awaiting response', style: TextStyle(color: Color(0xFF6B7280), fontSize: 10)),
            ])),
            if (showAccept)
              TextButton(
                onPressed: _actionId == c.id ? null : () => _acceptInvite(c.id),
                child: _actionId == c.id
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Accept', style: TextStyle(color: Color(0xFF818CF8), fontSize: 12)),
              ),
            IconButton(
              icon: const Icon(Icons.close, size: 16, color: Color(0xFF6B7280)),
              onPressed: _actionId == c.id ? null : () => _remove(c.id),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            ),
          ],
        ),
      );

  Widget _activityTile(FriendActivity f) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF111827),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: const Color(0xFFA855F7).withValues(alpha: 0.2),
                child: Text(
                  f.friendName.isNotEmpty ? f.friendName[0].toUpperCase() : '?',
                  style: const TextStyle(color: Color(0xFFC084FC), fontSize: 14, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(f.friendName, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                if (f.streakHighlight != null)
                  Text(f.streakHighlight!, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 11)),
              ])),
              if (f.momentumScore != null) Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text('${f.momentumScore}', style: const TextStyle(color: Color(0xFF818CF8), fontSize: 18, fontWeight: FontWeight.bold)),
                const Text('momentum', style: TextStyle(color: Color(0xFF6B7280), fontSize: 9)),
              ]),
            ]),
            const SizedBox(height: 10),
            Row(children: [
              _statChip(Icons.loop, '${f.habitsToday} habits', const Color(0xFF22C55E)),
              const SizedBox(width: 12),
              _statChip(Icons.task_alt, '${f.tasksToday} tasks', const Color(0xFF6366F1)),
            ]),
          ],
        ),
      );

  Widget _statChip(IconData icon, String label, Color color) => Row(children: [
        Icon(icon, size: 13, color: color),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w500)),
      ]);

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
