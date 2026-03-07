import 'package:flutter/material.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/knowledge_graph_service.dart';

class KnowledgeGraphScreen extends StatefulWidget {
  const KnowledgeGraphScreen({super.key});

  @override
  State<KnowledgeGraphScreen> createState() => _KnowledgeGraphScreenState();
}

class _KnowledgeGraphScreenState extends State<KnowledgeGraphScreen> {
  final _service = KnowledgeGraphService();
  KnowledgeGraph? _graph;
  bool _loading = true;
  String? _error;

  static const _nodeColors = {
    'habit': Color(0xFF6366F1),
    'health': Color(0xFF22C55E),
    'productivity': Color(0xFFF59E0B),
    'goal': Color(0xFFA855F7),
    'outcome': Color(0xFF06B6D4),
  };

  static const _directionColors = {
    'positive': Color(0xFF22C55E),
    'negative': Color(0xFFEF4444),
    'neutral': Color(0xFF6B7280),
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool force = false}) async {
    setState(() { _loading = true; _error = null; });
    try {
      final g = await _service.getGraph(force: force);
      setState(() => _graph = g);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Color _nodeColor(String type) => _nodeColors[type] ?? const Color(0xFF6366F1);
  Color _dirColor(String dir) => _directionColors[dir] ?? const Color(0xFF6B7280);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF060810),
      appBar: AppBar(
        backgroundColor: const Color(0xFF060810),
        title: const Text('Knowledge Graph', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: _loading ? null : () => _load(force: true),
          ),
        ],
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Color(0xFFEF4444), fontSize: 13)))
              : _graph == null
                  ? const SizedBox.shrink()
                  : _buildBody(),
    );
  }

  Widget _buildBody() {
    final g = _graph!;

    if (!g.hasEnoughData || g.nodes.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('🧬', style: TextStyle(fontSize: 48)),
            const SizedBox(height: 16),
            const Text('Building your graph…', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text(g.summary, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 13)),
          ],
        ),
      );
    }

    // Find keystone node
    final keystoneNode = g.keystoneNode != null
        ? g.nodes.where((n) => n.id == g.keystoneNode).firstOrNull
        : null;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Summary card
          _card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Influence Network', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 2),
                        Text('${g.nodes.length} nodes · ${g.edges.length} connections',
                            style: const TextStyle(color: Color(0xFF6B7280), fontSize: 11)),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(g.summary, style: const TextStyle(color: Color(0xFFD1D5DB), fontSize: 13, height: 1.5)),
                if (keystoneNode != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF6366F1).withValues(alpha:0.08),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF6366F1).withValues(alpha:0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.star, color: Color(0xFF818CF8), size: 14),
                        const SizedBox(width: 6),
                        const Text('Keystone: ', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12)),
                        Expanded(child: Text(keystoneNode.label,
                            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600))),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Nodes list
          _sectionLabel('Nodes'),
          const SizedBox(height: 8),
          ...g.nodes.map((node) {
            final color = _nodeColor(node.type);
            return _card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 40,
                    decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(4)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(node.label, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                            const SizedBox(width: 6),
                            _badge(node.type.toUpperCase(), color),
                          ],
                        ),
                        if (node.description != null)
                          Text(node.description!, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 11)),
                      ],
                    ),
                  ),
                  Column(
                    children: [
                      Text('${node.strength}', style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.bold)),
                      const Text('strength', style: TextStyle(color: Color(0xFF6B7280), fontSize: 9)),
                    ],
                  ),
                ],
              ),
            );
          }),

          const SizedBox(height: 16),
          // Edges list
          _sectionLabel('Connections'),
          const SizedBox(height: 8),
          ...g.edges.map((edge) {
            final color = _dirColor(edge.direction);
            final fromNode = g.nodes.where((n) => n.id == edge.from).firstOrNull;
            final toNode = g.nodes.where((n) => n.id == edge.to).firstOrNull;
            if (fromNode == null || toNode == null) return const SizedBox.shrink();
            return _card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(child: Text(fromNode.label,
                                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                                overflow: TextOverflow.ellipsis)),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 6),
                              child: Icon(
                                edge.direction == 'negative' ? Icons.arrow_forward : Icons.arrow_forward,
                                color: color, size: 14,
                              ),
                            ),
                            Flexible(child: Text(toNode.label,
                                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                                overflow: TextOverflow.ellipsis)),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(edge.label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w500)),
                      ],
                    ),
                  ),
                  _badge(edge.direction, color),
                ],
              ),
            );
          }),

          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _card({required Widget child, EdgeInsets? margin}) => Container(
        margin: margin ?? EdgeInsets.zero,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF111827),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha:0.06)),
        ),
        child: child,
      );

  Widget _sectionLabel(String text) => Text(text.toUpperCase(),
      style: const TextStyle(color: Color(0xFF6B7280), fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w600));

  Widget _badge(String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: color.withValues(alpha:0.1),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(text, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w600)),
      );
}
