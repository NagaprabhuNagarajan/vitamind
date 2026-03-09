import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SocialConnection {
  final String id;
  final String friendId;
  final String friendName;
  final String friendEmail;
  final String? friendAvatar;
  final String status; // pending | accepted | blocked
  final String direction; // outgoing | incoming
  final String createdAt;

  const SocialConnection({
    required this.id,
    required this.friendId,
    required this.friendName,
    required this.friendEmail,
    this.friendAvatar,
    required this.status,
    required this.direction,
    required this.createdAt,
  });

  factory SocialConnection.fromMap(Map<String, dynamic> m) => SocialConnection(
        id: m['id'] as String? ?? '',
        friendId: m['friend_id'] as String? ?? '',
        friendName: m['friend_name'] as String? ?? 'Unknown',
        friendEmail: m['friend_email'] as String? ?? '',
        friendAvatar: m['friend_avatar'] as String?,
        status: m['status'] as String? ?? 'pending',
        direction: m['direction'] as String? ?? 'outgoing',
        createdAt: m['created_at'] as String? ?? '',
      );
}

class FriendActivity {
  final String friendId;
  final String friendName;
  final String? friendAvatar;
  final int habitsToday;
  final int tasksToday;
  final int? momentumScore;
  final String? streakHighlight;

  const FriendActivity({
    required this.friendId,
    required this.friendName,
    this.friendAvatar,
    required this.habitsToday,
    required this.tasksToday,
    this.momentumScore,
    this.streakHighlight,
  });

  factory FriendActivity.fromMap(Map<String, dynamic> m) => FriendActivity(
        friendId: m['friend_id'] as String? ?? '',
        friendName: m['friend_name'] as String? ?? 'Unknown',
        friendAvatar: m['friend_avatar'] as String?,
        habitsToday: (m['habits_today'] as num?)?.toInt() ?? 0,
        tasksToday: (m['tasks_today'] as num?)?.toInt() ?? 0,
        momentumScore: (m['momentum_score'] as num?)?.toInt(),
        streakHighlight: m['streak_highlight'] as String?,
      );
}

class InviteResult {
  final bool ok;
  final String message;
  const InviteResult({required this.ok, required this.message});
  factory InviteResult.fromMap(Map<String, dynamic> m) =>
      InviteResult(ok: m['ok'] as bool? ?? false, message: m['message'] as String? ?? '');
}

class SocialService {
  final String _baseUrl;
  SocialService()
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

  Future<List<SocialConnection>> getConnections() async {
    try {
      final dio = Dio();
      final res = await dio.get(
        '$_baseUrl/api/v1/social/friends',
        options: Options(headers: await _authHeaders()),
      );
      return (res.data['data'] as List? ?? [])
          .map((e) => SocialConnection.fromMap(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('SocialService.getConnections failed: $e');
      rethrow;
    }
  }

  Future<List<FriendActivity>> getFeed() async {
    try {
      final dio = Dio();
      final res = await dio.get(
        '$_baseUrl/api/v1/social/feed',
        options: Options(headers: await _authHeaders()),
      );
      return (res.data['data'] as List? ?? [])
          .map((e) => FriendActivity.fromMap(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('SocialService.getFeed failed: $e');
      rethrow;
    }
  }

  Future<InviteResult> sendInvite(String email) async {
    try {
      final dio = Dio();
      final res = await dio.post(
        '$_baseUrl/api/v1/social/friends',
        data: {'email': email},
        options: Options(headers: await _authHeaders()),
      );
      return InviteResult.fromMap(res.data['data'] as Map<String, dynamic>);
    } catch (e) {
      debugPrint('SocialService.sendInvite failed: $e');
      rethrow;
    }
  }

  Future<void> acceptInvite(String id) async {
    try {
      final dio = Dio();
      await dio.put(
        '$_baseUrl/api/v1/social/friends/$id',
        options: Options(headers: await _authHeaders()),
      );
    } catch (e) {
      debugPrint('SocialService.acceptInvite failed: $e');
      rethrow;
    }
  }

  Future<void> removeConnection(String id) async {
    try {
      final dio = Dio();
      await dio.delete(
        '$_baseUrl/api/v1/social/friends/$id',
        options: Options(headers: await _authHeaders()),
      );
    } catch (e) {
      debugPrint('SocialService.removeConnection failed: $e');
      rethrow;
    }
  }
}
