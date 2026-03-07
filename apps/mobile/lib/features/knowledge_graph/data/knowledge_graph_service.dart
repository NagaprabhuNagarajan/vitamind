import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class GraphNode {
  final String id;
  final String label;
  final String type; // habit | health | productivity | goal | outcome
  final int strength;
  final String? description;

  const GraphNode({
    required this.id,
    required this.label,
    required this.type,
    required this.strength,
    this.description,
  });

  factory GraphNode.fromMap(Map<String, dynamic> m) => GraphNode(
        id: m['id'] as String? ?? '',
        label: m['label'] as String? ?? '',
        type: m['type'] as String? ?? 'outcome',
        strength: (m['strength'] as num?)?.toInt() ?? 50,
        description: m['description'] as String?,
      );
}

class GraphEdge {
  final String from;
  final String to;
  final String label;
  final int strength;
  final String direction; // positive | negative | neutral

  const GraphEdge({
    required this.from,
    required this.to,
    required this.label,
    required this.strength,
    required this.direction,
  });

  factory GraphEdge.fromMap(Map<String, dynamic> m) => GraphEdge(
        from: m['from'] as String? ?? '',
        to: m['to'] as String? ?? '',
        label: m['label'] as String? ?? '',
        strength: (m['strength'] as num?)?.toInt() ?? 50,
        direction: m['direction'] as String? ?? 'neutral',
      );
}

class KnowledgeGraph {
  final List<GraphNode> nodes;
  final List<GraphEdge> edges;
  final String? keystoneNode;
  final String summary;
  final bool hasEnoughData;
  final String computedAt;

  const KnowledgeGraph({
    required this.nodes,
    required this.edges,
    this.keystoneNode,
    required this.summary,
    required this.hasEnoughData,
    required this.computedAt,
  });

  factory KnowledgeGraph.fromMap(Map<String, dynamic> m) => KnowledgeGraph(
        nodes: (m['nodes'] as List? ?? [])
            .map((e) => GraphNode.fromMap(e as Map<String, dynamic>))
            .toList(),
        edges: (m['edges'] as List? ?? [])
            .map((e) => GraphEdge.fromMap(e as Map<String, dynamic>))
            .toList(),
        keystoneNode: m['keystone_node'] as String?,
        summary: m['summary'] as String? ?? '',
        hasEnoughData: m['has_enough_data'] as bool? ?? false,
        computedAt: m['computed_at'] as String? ?? '',
      );
}

class KnowledgeGraphService {
  final String _baseUrl;
  KnowledgeGraphService()
      : _baseUrl = const String.fromEnvironment(
          'API_BASE_URL',
          defaultValue: 'https://vitamind-woad.vercel.app',
        );

  Future<Map<String, String>> _authHeaders() async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) throw Exception('Not authenticated');
    return {
      'Authorization': 'Bearer ${session.accessToken}',
      'Content-Type': 'application/json',
    };
  }

  Future<KnowledgeGraph> getGraph({bool force = false}) async {
    try {
      final dio = Dio();
      final url = force ? '$_baseUrl/api/v1/knowledge-graph?force=true' : '$_baseUrl/api/v1/knowledge-graph';
      final res = await dio.get(
        url,
        options: Options(headers: await _authHeaders()),
      );
      return KnowledgeGraph.fromMap(res.data['data'] as Map<String, dynamic>);
    } catch (e) {
      debugPrint('KnowledgeGraphService.getGraph failed: $e');
      rethrow;
    }
  }
}
