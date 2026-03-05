import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Lightweight JSON cache backed by SharedPreferences.
///
/// Stores each entry as two keys:
///   - `cache_<key>`: the JSON-encoded payload
///   - `cache_<key>_ts`: the Unix-millisecond timestamp of when it was saved
///
/// This avoids SQLite/Hive complexity while giving us expiry-aware
/// offline reads for list screens and the dashboard.
class CacheService {
  static const _prefix = 'cache_';
  static const _tsSuffix = '_ts';

  /// Persist [data] (must be JSON-serializable) under [key].
  static Future<void> save(String key, dynamic data) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = jsonEncode(data);
      await prefs.setString('$_prefix$key', json);
      await prefs.setInt(
        '$_prefix$key$_tsSuffix',
        DateTime.now().millisecondsSinceEpoch,
      );
    } catch (e) {
      // Cache writes are best-effort; never block the caller.
      debugPrint('CacheService.save($key) failed: $e');
    }
  }

  /// Load cached data for [key], returning `null` when:
  ///   - no cached entry exists, or
  ///   - the entry is older than [maxAge].
  static Future<T?> load<T>(
    String key, {
    Duration maxAge = const Duration(hours: 24),
  }) {
    return _read<T>(key, maxAge: maxAge);
  }

  /// Returns `true` when a cached entry exists and is younger than [maxAge].
  static Future<bool> isFresh(
    String key, {
    Duration maxAge = const Duration(hours: 1),
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final ts = prefs.getInt('$_prefix$key$_tsSuffix');
      if (ts == null) return false;

      final age = DateTime.now().millisecondsSinceEpoch - ts;
      return age < maxAge.inMilliseconds;
    } catch (_) {
      return false;
    }
  }

  /// Remove a single key's cache, or wipe all cache entries when [key] is null.
  static Future<void> clear([String? key]) async {
    final prefs = await SharedPreferences.getInstance();

    if (key != null) {
      await prefs.remove('$_prefix$key');
      await prefs.remove('$_prefix$key$_tsSuffix');
      return;
    }

    // Wipe every cache-prefixed key.
    final allKeys = prefs.getKeys().where((k) => k.startsWith(_prefix));
    for (final k in allKeys) {
      await prefs.remove(k);
    }
  }

  // ── internal ───────────────────────────────────────────────────────────────

  static Future<T?> _read<T>(String key, {required Duration maxAge}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('$_prefix$key');
      final ts = prefs.getInt('$_prefix$key$_tsSuffix');

      if (raw == null || ts == null) return null;

      final age = DateTime.now().millisecondsSinceEpoch - ts;
      if (age > maxAge.inMilliseconds) return null;

      return jsonDecode(raw) as T;
    } catch (e) {
      debugPrint('CacheService.load($key) failed: $e');
      return null;
    }
  }
}
