import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class FinancialEntry {
  final String id;
  final String type; // 'income' | 'expense'
  final double amount;
  final String currency;
  final String category;
  final String? description;
  final String date;

  const FinancialEntry({
    required this.id,
    required this.type,
    required this.amount,
    required this.currency,
    required this.category,
    this.description,
    required this.date,
  });

  factory FinancialEntry.fromMap(Map<String, dynamic> m) => FinancialEntry(
        id: m['id'] as String,
        type: m['type'] as String,
        amount: (m['amount'] as num).toDouble(),
        currency: m['currency'] as String? ?? 'INR',
        category: m['category'] as String,
        description: m['description'] as String?,
        date: m['date'] as String,
      );
}

class MonthlySummary {
  final String month;
  final double totalIncome;
  final double totalExpense;
  final double net;
  final String? topExpenseCategory;
  final Map<String, double> byCategory;

  const MonthlySummary({
    required this.month,
    required this.totalIncome,
    required this.totalExpense,
    required this.net,
    this.topExpenseCategory,
    required this.byCategory,
  });

  factory MonthlySummary.fromMap(Map<String, dynamic> m) {
    final raw = m['by_category'] as Map<String, dynamic>? ?? {};
    return MonthlySummary(
      month: m['month'] as String,
      totalIncome: (m['total_income'] as num).toDouble(),
      totalExpense: (m['total_expense'] as num).toDouble(),
      net: (m['net'] as num).toDouble(),
      topExpenseCategory: m['top_expense_category'] as String?,
      byCategory: raw.map((k, v) => MapEntry(k, (v as num).toDouble())),
    );
  }
}

class FinanceData {
  final List<FinancialEntry> entries;
  final MonthlySummary summary;
  final List<String> expenseCategories;
  final List<String> incomeCategories;

  const FinanceData({
    required this.entries,
    required this.summary,
    required this.expenseCategories,
    required this.incomeCategories,
  });
}

class FinanceService {
  final String _baseUrl;
  FinanceService()
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

  Future<FinanceData> getFinanceData(String month) async {
    try {
      final dio = Dio();
      final res = await dio.get(
        '$_baseUrl/api/v1/finance',
        queryParameters: {'month': month},
        options: Options(headers: await _authHeaders()),
      );
      final data = res.data['data'] as Map<String, dynamic>;
      final cats = data['categories'] as Map<String, dynamic>;
      return FinanceData(
        entries: (data['entries'] as List)
            .map((e) => FinancialEntry.fromMap(e as Map<String, dynamic>))
            .toList(),
        summary: MonthlySummary.fromMap(data['summary'] as Map<String, dynamic>),
        expenseCategories:
            (cats['expense'] as List).map((e) => e as String).toList(),
        incomeCategories:
            (cats['income'] as List).map((e) => e as String).toList(),
      );
    } catch (e) {
      debugPrint('FinanceService.getFinanceData failed: $e');
      rethrow;
    }
  }

  Future<void> addEntry({
    required String type,
    required double amount,
    required String category,
    String? description,
    String? date,
    String currency = 'INR',
  }) async {
    try {
      final dio = Dio();
      await dio.post(
        '$_baseUrl/api/v1/finance',
        data: {
          'type': type,
          'amount': amount,
          'category': category,
          if (description != null) 'description': description,
          if (date != null) 'date': date,
          'currency': currency,
        },
        options: Options(headers: await _authHeaders()),
      );
    } catch (e) {
      debugPrint('FinanceService.addEntry failed: $e');
      rethrow;
    }
  }

  Future<void> deleteEntry(String id) async {
    try {
      final dio = Dio();
      await dio.delete(
        '$_baseUrl/api/v1/finance/$id',
        options: Options(headers: await _authHeaders()),
      );
    } catch (e) {
      debugPrint('FinanceService.deleteEntry failed: $e');
      rethrow;
    }
  }
}
