import 'package:flutter/material.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/finance_service.dart';

class FinanceScreen extends StatefulWidget {
  const FinanceScreen({super.key});

  @override
  State<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends State<FinanceScreen> {
  final _service = FinanceService();
  FinanceData? _data;
  bool _loading = true;
  String _month = DateTime.now().toIso8601String().substring(0, 7);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await _service.getFinanceData(_month);
      setState(() => _data = data);
    } catch (_) {
    } finally {
      setState(() => _loading = false);
    }
  }

  String _fmt(double amount, [String currency = 'INR']) {
    final sym = currency == 'INR' ? '₹' : currency;
    return '$sym${amount.abs().toStringAsFixed(0)}';
  }

  Future<void> _showAddEntrySheet() async {
    final cats = _data;
    if (cats == null) return;
    String type = 'expense';
    String category = '';
    final amountCtrl = TextEditingController();
    final descCtrl = TextEditingController();

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0D0F1A),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.only(
            left: 20, right: 20, top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Add entry', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Row(
                children: ['expense', 'income'].map((t) => Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(right: t == 'expense' ? 4 : 0, left: t == 'income' ? 4 : 0),
                    child: ElevatedButton(
                      onPressed: () => setS(() { type = t; category = ''; }),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: type == t ? const Color(0xFF6366F1) : const Color(0xFF1A1D2E),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: Text(t[0].toUpperCase() + t.substring(1)),
                    ),
                  ),
                )).toList(),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: amountCtrl,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Colors.white),
                decoration: _inputDecoration('Amount'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: category.isEmpty ? null : category,
                hint: const Text('Select category', style: TextStyle(color: Color(0xFF6B7280))),
                dropdownColor: const Color(0xFF1A1D2E),
                style: const TextStyle(color: Colors.white),
                decoration: _inputDecoration('Category'),
                items: (type == 'expense' ? cats.expenseCategories : cats.incomeCategories)
                    .map((c) => DropdownMenuItem(value: c, child: Text(c[0].toUpperCase() + c.substring(1))))
                    .toList(),
                onChanged: (v) => setS(() => category = v ?? ''),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: _inputDecoration('Description (optional)'),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: category.isEmpty || amountCtrl.text.isEmpty
                      ? null
                      : () async {
                          final amount = double.tryParse(amountCtrl.text);
                          if (amount == null || amount <= 0) return;
                          await _service.addEntry(
                            type: type,
                            amount: amount,
                            category: category,
                            description: descCtrl.text.isEmpty ? null : descCtrl.text,
                          );
                          if (ctx.mounted) Navigator.pop(ctx);
                          await _load();
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Add', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) => InputDecoration(
    hintText: hint,
    hintStyle: const TextStyle(color: Color(0xFF6B7280)),
    filled: true,
    fillColor: const Color(0xFF1A1D2E),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
  );

  @override
  Widget build(BuildContext context) {
    final summary = _data?.summary;
    return Scaffold(
      backgroundColor: const Color(0xFF060810),
      appBar: AppBar(
        backgroundColor: const Color(0xFF060810),
        title: const Text('Finance', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        actions: [
          TextButton(
            onPressed: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: DateTime.now(),
                firstDate: DateTime(2020),
                lastDate: DateTime.now(),
                initialEntryMode: DatePickerEntryMode.input,
              );
              if (picked != null) {
                setState(() => _month = '${picked.year}-${picked.month.toString().padLeft(2, '0')}');
                _load();
              }
            },
            child: Text(_month, style: const TextStyle(color: Color(0xFF6366F1))),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
            : CustomScrollView(
                slivers: [
                  if (summary != null)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                _SummaryCard(label: 'Income', amount: _fmt(summary.totalIncome), color: const Color(0xFF4ADE80)),
                                const SizedBox(width: 8),
                                _SummaryCard(label: 'Expenses', amount: _fmt(summary.totalExpense), color: const Color(0xFFF87171)),
                                const SizedBox(width: 8),
                                _SummaryCard(
                                  label: 'Net',
                                  amount: '${summary.net >= 0 ? '' : '-'}${_fmt(summary.net)}',
                                  color: summary.net >= 0 ? const Color(0xFF6366F1) : const Color(0xFFF87171),
                                ),
                              ],
                            ),
                            if (summary.byCategory.isNotEmpty) ...[
                              const SizedBox(height: 16),
                              _CategoryBreakdown(summary: summary),
                            ],
                          ],
                        ),
                      ),
                    ),
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    sliver: (_data?.entries ?? []).isEmpty
                        ? SliverToBoxAdapter(
                            child: Container(
                              padding: const EdgeInsets.all(32),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0D0F1A),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: const Center(
                                child: Text('No entries for this month.\nTap + to add one.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(color: Color(0xFF6B7280))),
                              ),
                            ),
                          )
                        : SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (ctx, i) {
                                final e = _data!.entries[i];
                                return Dismissible(
                                  key: Key(e.id),
                                  direction: DismissDirection.endToStart,
                                  background: Container(
                                    alignment: Alignment.centerRight,
                                    padding: const EdgeInsets.only(right: 16),
                                    color: Colors.red.withValues(alpha: 0.2),
                                    child: const Icon(Icons.delete, color: Colors.red),
                                  ),
                                  onDismissed: (_) async {
                                    await _service.deleteEntry(e.id);
                                    await _load();
                                  },
                                  child: _EntryTile(entry: e, fmt: _fmt),
                                );
                              },
                              childCount: _data!.entries.length,
                            ),
                          ),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 100)),
                ],
              ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddEntrySheet,
        backgroundColor: const Color(0xFF6366F1),
        child: const Icon(Icons.add, color: Colors.white),
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String label;
  final String amount;
  final Color color;
  const _SummaryCard({required this.label, required this.amount, required this.color});

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 11)),
          const SizedBox(height: 4),
          Text(amount, style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.bold)),
        ],
      ),
    ),
  );
}

class _CategoryBreakdown extends StatelessWidget {
  final MonthlySummary summary;
  const _CategoryBreakdown({required this.summary});

  @override
  Widget build(BuildContext context) {
    final sorted = summary.byCategory.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0D0F1A),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Expense breakdown', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 10),
          ...sorted.map((entry) {
            final pct = summary.totalExpense > 0 ? entry.value / summary.totalExpense : 0.0;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(entry.key[0].toUpperCase() + entry.key.substring(1), style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12)),
                      Text('₹${entry.value.toStringAsFixed(0)} (${(pct * 100).round()}%)', style: const TextStyle(color: Colors.white, fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 3),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: pct,
                      backgroundColor: const Color(0xFF1A1D2E),
                      valueColor: const AlwaysStoppedAnimation(Color(0xFF6366F1)),
                      minHeight: 5,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _EntryTile extends StatelessWidget {
  final FinancialEntry entry;
  final String Function(double, [String]) fmt;
  const _EntryTile({required this.entry, required this.fmt});

  @override
  Widget build(BuildContext context) {
    final isIncome = entry.type == 'income';
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0D0F1A),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: isIncome ? const Color(0xFF4ADE80).withValues(alpha: 0.15) : const Color(0xFFF87171).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(
              child: Text(
                isIncome ? '+' : '-',
                style: TextStyle(
                  color: isIncome ? const Color(0xFF4ADE80) : const Color(0xFFF87171),
                  fontWeight: FontWeight.bold, fontSize: 18,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.category[0].toUpperCase() + entry.category.substring(1) +
                      (entry.description != null ? ' — ${entry.description}' : ''),
                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
                ),
                Text(entry.date, style: const TextStyle(color: Color(0xFF6B7280), fontSize: 11)),
              ],
            ),
          ),
          Text(
            '${isIncome ? '+' : '-'}${fmt(entry.amount, entry.currency)}',
            style: TextStyle(
              color: isIncome ? const Color(0xFF4ADE80) : const Color(0xFFF87171),
              fontWeight: FontWeight.bold, fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}
