import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/cache_service.dart';

class Contract {
  final String id;
  final String userId;
  final String title;
  final String? description;
  final String type;
  final String? targetId;
  final String commitment;
  final String? stakes;
  final int? stakeAmountCents;
  final String checkInFrequency;
  final String startDate;
  final String endDate;
  final String status;
  final int progress;
  final int misses;
  final DateTime createdAt;

  const Contract({
    required this.id,
    required this.userId,
    required this.title,
    this.description,
    required this.type,
    this.targetId,
    required this.commitment,
    this.stakes,
    this.stakeAmountCents,
    required this.checkInFrequency,
    required this.startDate,
    required this.endDate,
    required this.status,
    required this.progress,
    required this.misses,
    required this.createdAt,
  });

  factory Contract.fromMap(Map<String, dynamic> m) => Contract(
        id: m['id'] as String,
        userId: m['user_id'] as String,
        title: m['title'] as String,
        description: m['description'] as String?,
        type: m['type'] as String? ?? 'habit',
        targetId: m['target_id'] as String?,
        commitment: m['commitment'] as String? ?? '',
        stakes: m['stakes'] as String?,
        stakeAmountCents: (m['stake_amount_cents'] as num?)?.toInt(),
        checkInFrequency: m['check_in_frequency'] as String? ?? 'daily',
        startDate: m['start_date'] as String,
        endDate: m['end_date'] as String,
        status: m['status'] as String? ?? 'active',
        progress: (m['progress'] as num?)?.toInt() ?? 0,
        misses: (m['misses'] as num?)?.toInt() ?? 0,
        createdAt: DateTime.parse(m['created_at'] as String),
      );

  Map<String, dynamic> toMap() => {
        'id': id,
        'user_id': userId,
        'title': title,
        'description': description,
        'type': type,
        'target_id': targetId,
        'commitment': commitment,
        'stakes': stakes,
        'stake_amount_cents': stakeAmountCents,
        'check_in_frequency': checkInFrequency,
        'start_date': startDate,
        'end_date': endDate,
        'status': status,
        'progress': progress,
        'misses': misses,
        'created_at': createdAt.toIso8601String(),
      };

  Contract copyWith({
    String? status,
    int? progress,
    int? misses,
  }) =>
      Contract(
        id: id,
        userId: userId,
        title: title,
        description: description,
        type: type,
        targetId: targetId,
        commitment: commitment,
        stakes: stakes,
        stakeAmountCents: stakeAmountCents,
        checkInFrequency: checkInFrequency,
        startDate: startDate,
        endDate: endDate,
        status: status ?? this.status,
        progress: progress ?? this.progress,
        misses: misses ?? this.misses,
        createdAt: createdAt,
      );
}

class ContractCheckin {
  final String id;
  final String contractId;
  final String userId;
  final String date;
  final bool met;
  final bool autoTracked;
  final String? notes;
  final DateTime createdAt;

  const ContractCheckin({
    required this.id,
    required this.contractId,
    required this.userId,
    required this.date,
    required this.met,
    required this.autoTracked,
    this.notes,
    required this.createdAt,
  });

  factory ContractCheckin.fromMap(Map<String, dynamic> m) =>
      ContractCheckin(
        id: m['id'] as String,
        contractId: m['contract_id'] as String,
        userId: m['user_id'] as String,
        date: m['date'] as String,
        met: m['met'] as bool? ?? false,
        autoTracked: m['auto_tracked'] as bool? ?? false,
        notes: m['notes'] as String?,
        createdAt: DateTime.parse(m['created_at'] as String),
      );

  Map<String, dynamic> toMap() => {
        'id': id,
        'contract_id': contractId,
        'user_id': userId,
        'date': date,
        'met': met,
        'auto_tracked': autoTracked,
        'notes': notes,
        'created_at': createdAt.toIso8601String(),
      };

  ContractCheckin copyWith({
    bool? met,
    String? notes,
  }) =>
      ContractCheckin(
        id: id,
        contractId: contractId,
        userId: userId,
        date: date,
        met: met ?? this.met,
        autoTracked: autoTracked,
        notes: notes ?? this.notes,
        createdAt: createdAt,
      );
}

class AccountabilityService {
  final _supabase = Supabase.instance.client;

  static String _contractsCacheKey(String userId) => 'contracts_$userId';
  static String _checkinsCacheKey(String contractId) =>
      'contract_checkins_$contractId';

  /// Fetches all accountability contracts for the user.
  Future<List<Contract>> fetchAll(String userId) async {
    final cacheKey = _contractsCacheKey(userId);

    try {
      final data = await _supabase
          .from('contracts')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false);

      final contracts = (data as List)
          .map((m) => Contract.fromMap(m as Map<String, dynamic>))
          .toList();

      await CacheService.save(
        cacheKey,
        contracts.map((c) => c.toMap()).toList(),
      );

      return contracts;
    } catch (e) {
      debugPrint('AccountabilityService.fetchAll failed: $e');

      final cached = await CacheService.load<List<dynamic>>(cacheKey);
      if (cached != null) {
        debugPrint('AccountabilityService: serving cached contracts');
        return cached
            .map((m) => Contract.fromMap(m as Map<String, dynamic>))
            .toList();
      }
      rethrow;
    }
  }

  /// Creates a new accountability contract.
  Future<void> create({
    required String userId,
    required String title,
    String? description,
    required String type,
    String? targetId,
    required String commitment,
    String? stakes,
    int? stakeAmountCents,
    required String checkInFrequency,
    required String startDate,
    required String endDate,
  }) async {
    await _supabase.from('contracts').insert({
      'user_id': userId,
      'title': title,
      if (description != null) 'description': description,
      'type': type,
      if (targetId != null) 'target_id': targetId,
      'commitment': commitment,
      if (stakes != null) 'stakes': stakes,
      if (stakeAmountCents != null) 'stake_amount_cents': stakeAmountCents,
      'check_in_frequency': checkInFrequency,
      'start_date': startDate,
      'end_date': endDate,
      'status': 'active',
      'progress': 0,
      'misses': 0,
    });
  }

  /// Records a check-in for today, using upsert to prevent duplicates.
  Future<void> checkin(
    String contractId,
    String userId,
    bool met, {
    String? notes,
  }) async {
    final today = _todayStr();

    await _supabase.from('contract_checkins').upsert({
      'contract_id': contractId,
      'user_id': userId,
      'date': today,
      'met': met,
      'auto_tracked': false,
      if (notes != null) 'notes': notes,
    }, onConflict: 'contract_id,date');
  }

  /// Cancels an accountability contract.
  Future<void> cancel(String contractId) async {
    await _supabase
        .from('contracts')
        .update({'status': 'cancelled'})
        .eq('id', contractId);
  }

  /// Fetches recent check-ins for a contract.
  Future<List<ContractCheckin>> fetchCheckins(
    String contractId, {
    int limit = 14,
  }) async {
    final cacheKey = _checkinsCacheKey(contractId);

    try {
      final data = await _supabase
          .from('contract_checkins')
          .select()
          .eq('contract_id', contractId)
          .order('date', ascending: false)
          .limit(limit);

      final checkins = (data as List)
          .map((m) => ContractCheckin.fromMap(m as Map<String, dynamic>))
          .toList();

      await CacheService.save(
        cacheKey,
        checkins.map((c) => c.toMap()).toList(),
      );

      return checkins;
    } catch (e) {
      debugPrint('AccountabilityService.fetchCheckins failed: $e');

      final cached = await CacheService.load<List<dynamic>>(cacheKey);
      if (cached != null) {
        return cached
            .map((m) =>
                ContractCheckin.fromMap(m as Map<String, dynamic>))
            .toList();
      }
      rethrow;
    }
  }

  static String _todayStr() {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }
}
