import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/cache_service.dart';

/// A single event on the user's life timeline -- tasks completed, goals
/// reached, habits logged, personal milestones, or free-form notes.
class LifeEvent {
  final String id;
  final String userId;
  final String eventType;
  final String title;
  final String? description;
  final Map<String, dynamic> metadata;
  final DateTime eventDate;
  final DateTime createdAt;

  const LifeEvent({
    required this.id,
    required this.userId,
    required this.eventType,
    required this.title,
    this.description,
    this.metadata = const {},
    required this.eventDate,
    required this.createdAt,
  });

  factory LifeEvent.fromMap(Map<String, dynamic> m) {
    return LifeEvent(
      id: m['id'] as String,
      userId: m['user_id'] as String,
      eventType: m['event_type'] as String,
      title: m['title'] as String,
      description: m['description'] as String?,
      metadata: (m['metadata'] as Map<String, dynamic>?) ?? const {},
      eventDate: DateTime.parse(m['event_date'] as String),
      createdAt: DateTime.parse(m['created_at'] as String),
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'user_id': userId,
        'event_type': eventType,
        'title': title,
        'description': description,
        'metadata': metadata,
        'event_date': eventDate.toIso8601String(),
        'created_at': createdAt.toIso8601String(),
      };

  /// Returns true for types that users manually create and can delete.
  bool get isDeletable =>
      eventType == 'note' || eventType == 'milestone';
}

class TimelineService {
  final _supabase = Supabase.instance.client;

  static const _cacheKey = 'timeline_events';
  static const _cacheTtl = Duration(hours: 1);
  static const _table = 'life_events';

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /// Fetches paginated timeline events with optional filters.
  ///
  /// [type] narrows to a single event_type (e.g. "task", "goal").
  /// [from]/[to] restrict the date window (ISO-8601 date strings).
  Future<List<LifeEvent>> getEvents({
    int page = 1,
    int limit = 20,
    String? type,
    String? from,
    String? to,
  }) async {
    final userId = _supabase.auth.currentUser!.id;
    final cacheTag = '${_cacheKey}_${userId}_${type ?? 'all'}_$page';

    try {
      var query = _supabase
          .from(_table)
          .select()
          .eq('user_id', userId);

      if (type != null) {
        query = query.eq('event_type', type);
      }
      if (from != null) {
        query = query.gte('event_date', from);
      }
      if (to != null) {
        query = query.lte('event_date', to);
      }

      final offset = (page - 1) * limit;
      final data = await query
          .order('event_date', ascending: false)
          .range(offset, offset + limit - 1);

      final events = (data as List)
          .map((m) => LifeEvent.fromMap(m as Map<String, dynamic>))
          .toList();

      // Persist page 1 of the unfiltered feed for offline access.
      if (page == 1 && type == null) {
        await CacheService.save(
          cacheTag,
          events.map((e) => e.toMap()).toList(),
        );
      }

      return events;
    } catch (e) {
      debugPrint('TimelineService.getEvents failed: $e');

      // Fall back to cache for the first unfiltered page.
      if (page == 1 && type == null) {
        final cached = await CacheService.load<List<dynamic>>(
          cacheTag,
          maxAge: _cacheTtl,
        );
        if (cached != null) {
          debugPrint('TimelineService: serving cached events');
          return cached
              .map((m) => LifeEvent.fromMap(m as Map<String, dynamic>))
              .toList();
        }
      }
      rethrow;
    }
  }

  /// Full-text search over event titles and descriptions.
  Future<List<LifeEvent>> searchEvents(
    String query, {
    int limit = 20,
  }) async {
    final userId = _supabase.auth.currentUser!.id;
    final pattern = '%$query%';

    try {
      final data = await _supabase
          .from(_table)
          .select()
          .eq('user_id', userId)
          .or('title.ilike.$pattern,description.ilike.$pattern')
          .order('event_date', ascending: false)
          .limit(limit);

      return (data as List)
          .map((m) => LifeEvent.fromMap(m as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('TimelineService.searchEvents failed: $e');
      rethrow;
    }
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  /// Creates a user-authored event (milestone or note).
  Future<LifeEvent> addEvent({
    required String title,
    String? description,
    required String eventType,
    String? eventDate,
  }) async {
    final userId = _supabase.auth.currentUser!.id;
    final now = DateTime.now();

    final row = {
      'user_id': userId,
      'title': title.trim(),
      'description': description?.trim(),
      'event_type': eventType,
      'event_date': eventDate ?? now.toIso8601String(),
      'metadata': <String, dynamic>{},
    };

    try {
      final data = await _supabase
          .from(_table)
          .insert(row)
          .select()
          .single();

      // Invalidate cached first page so the next fetch includes the new event.
      await CacheService.clear('${_cacheKey}_${userId}_all_1');

      return LifeEvent.fromMap(data);
    } catch (e) {
      debugPrint('TimelineService.addEvent failed: $e');
      rethrow;
    }
  }

  /// Deletes a user-created event. Only notes and milestones should be
  /// deletable -- system-generated events (task/goal/habit) are protected.
  Future<void> deleteEvent(String id) async {
    final userId = _supabase.auth.currentUser!.id;

    try {
      await _supabase
          .from(_table)
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

      await CacheService.clear('${_cacheKey}_${userId}_all_1');
    } catch (e) {
      debugPrint('TimelineService.deleteEvent failed: $e');
      rethrow;
    }
  }
}
