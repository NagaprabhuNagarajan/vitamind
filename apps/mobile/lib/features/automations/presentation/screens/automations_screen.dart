import 'package:flutter/material.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../data/automations_service.dart';

class AutomationsScreen extends StatefulWidget {
  const AutomationsScreen({super.key});

  @override
  State<AutomationsScreen> createState() => _AutomationsScreenState();
}

class _AutomationsScreenState extends State<AutomationsScreen> {
  final _service = AutomationsService();
  List<AutomationRule> _rules = [];
  Map<String, String> _triggerLabels = {};
  Map<String, String> _actionLabels = {};
  bool _loading = true;

  static const _triggerDescriptions = {
    'habit_streak_broken': 'When a habit is missed today',
    'task_overdue': 'When any task becomes overdue',
    'goal_deadline_approaching': 'When a goal deadline is near',
    'momentum_low': 'When momentum score drops',
    'burnout_high': 'When burnout risk is high',
  };

  static const _actionDescriptions = {
    'create_task': 'Auto-create a recovery task',
    'send_notification': 'Send a push notification',
    'webhook': 'POST to a webhook URL',
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final result = await _service.getRules();
      setState(() {
        _rules = result.rules;
        _triggerLabels = result.triggerLabels;
        _actionLabels = result.actionLabels;
      });
    } catch (_) {
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _showCreateSheet() async {
    String name = '';
    String triggerType = 'task_overdue';
    String actionType = 'create_task';
    final taskTitleCtrl = TextEditingController();
    final notifCtrl = TextEditingController();
    final webhookCtrl = TextEditingController();
    final thresholdCtrl = TextEditingController(text: '40');

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
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('New automation', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                _inputField(
                  hint: 'Name',
                  onChanged: (v) => name = v,
                ),
                const SizedBox(height: 12),
                const Text('Trigger', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12)),
                const SizedBox(height: 4),
                DropdownButtonFormField<String>(
                  initialValue: triggerType,
                  dropdownColor: const Color(0xFF1A1D2E),
                  style: const TextStyle(color: Colors.white),
                  decoration: _dropDecoration(),
                  items: _triggerLabels.entries
                      .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value, style: const TextStyle(fontSize: 13))))
                      .toList(),
                  onChanged: (v) => setS(() => triggerType = v ?? triggerType),
                ),
                if (['momentum_low', 'burnout_high', 'goal_deadline_approaching'].contains(triggerType)) ...[
                  const SizedBox(height: 8),
                  _inputField(
                    hint: triggerType == 'goal_deadline_approaching' ? 'Days ahead (e.g. 7)' : 'Threshold (e.g. 40)',
                    controller: thresholdCtrl,
                    keyboard: TextInputType.number,
                  ),
                ],
                const SizedBox(height: 12),
                const Text('Action', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12)),
                const SizedBox(height: 4),
                DropdownButtonFormField<String>(
                  initialValue: actionType,
                  dropdownColor: const Color(0xFF1A1D2E),
                  style: const TextStyle(color: Colors.white),
                  decoration: _dropDecoration(),
                  items: _actionLabels.entries
                      .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value, style: const TextStyle(fontSize: 13))))
                      .toList(),
                  onChanged: (v) => setS(() => actionType = v ?? actionType),
                ),
                if (actionType == 'create_task') ...[
                  const SizedBox(height: 8),
                  _inputField(controller: taskTitleCtrl, hint: 'Task title (optional)'),
                ],
                if (actionType == 'send_notification') ...[
                  const SizedBox(height: 8),
                  _inputField(controller: notifCtrl, hint: 'Notification message'),
                ],
                if (actionType == 'webhook') ...[
                  const SizedBox(height: 8),
                  _inputField(controller: webhookCtrl, hint: 'Webhook URL', keyboard: TextInputType.url),
                ],
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: name.isEmpty
                        ? null
                        : () async {
                            final triggerConfig = <String, dynamic>{};
                            final actionConfig = <String, dynamic>{};
                            if (['momentum_low', 'burnout_high'].contains(triggerType)) {
                              triggerConfig['threshold'] = int.tryParse(thresholdCtrl.text) ?? 40;
                            }
                            if (triggerType == 'goal_deadline_approaching') {
                              triggerConfig['days_ahead'] = int.tryParse(thresholdCtrl.text) ?? 7;
                            }
                            if (actionType == 'create_task' && taskTitleCtrl.text.isNotEmpty) {
                              actionConfig['title'] = taskTitleCtrl.text;
                            }
                            if (actionType == 'send_notification') {
                              actionConfig['message'] = notifCtrl.text;
                            }
                            if (actionType == 'webhook') {
                              actionConfig['url'] = webhookCtrl.text;
                            }
                            await _service.createRule(
                              name: name,
                              triggerType: triggerType,
                              actionType: actionType,
                              triggerConfig: triggerConfig,
                              actionConfig: actionConfig,
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
                    child: const Text('Create', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _inputField({
    String? hint,
    TextEditingController? controller,
    TextInputType keyboard = TextInputType.text,
    ValueChanged<String>? onChanged,
  }) =>
      TextField(
        controller: controller,
        keyboardType: keyboard,
        style: const TextStyle(color: Colors.white, fontSize: 13),
        onChanged: onChanged,
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: Color(0xFF6B7280)),
          filled: true,
          fillColor: const Color(0xFF1A1D2E),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        ),
      );

  InputDecoration _dropDecoration() => InputDecoration(
    filled: true,
    fillColor: const Color(0xFF1A1D2E),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF060810),
      appBar: AppBar(
        backgroundColor: const Color(0xFF060810),
        title: const Text('Automations', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
            : _rules.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.bolt_outlined, size: 48, color: Color(0xFF6B7280)),
                          const SizedBox(height: 12),
                          const Text('No automations yet', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 6),
                          const Text(
                            'Create rules to trigger tasks, notifications or webhooks automatically.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Color(0xFF6B7280), fontSize: 13),
                          ),
                          const SizedBox(height: 20),
                          ElevatedButton.icon(
                            onPressed: _showCreateSheet,
                            icon: const Icon(Icons.add),
                            label: const Text('Create automation'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF6366F1),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _rules.length,
                    itemBuilder: (ctx, i) {
                      final rule = _rules[i];
                      return Dismissible(
                        key: Key(rule.id),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 16),
                          color: Colors.red.withValues(alpha: 0.2),
                          child: const Icon(Icons.delete, color: Colors.red),
                        ),
                        onDismissed: (_) async {
                          await _service.deleteRule(rule.id);
                          await _load();
                        },
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0D0F1A),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: rule.isActive
                                  ? const Color(0xFF6366F1).withValues(alpha: 0.25)
                                  : Colors.transparent,
                            ),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                Icons.bolt,
                                color: rule.isActive ? const Color(0xFF6366F1) : const Color(0xFF6B7280),
                                size: 20,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(rule.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${_triggerDescriptions[rule.triggerType] ?? rule.triggerType}  →  ${_actionDescriptions[rule.actionType] ?? rule.actionType}',
                                      style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 11),
                                    ),
                                    if (rule.lastTriggeredAt != null) ...[
                                      const SizedBox(height: 2),
                                      Text('Last fired: ${rule.lastTriggeredAt!.substring(0, 10)}',
                                          style: const TextStyle(color: Color(0xFF6B7280), fontSize: 10)),
                                    ],
                                  ],
                                ),
                              ),
                              Switch(
                                value: rule.isActive,
                                onChanged: (v) async {
                                  await _service.toggleRule(rule.id, v);
                                  await _load();
                                },
                                activeThumbColor: const Color(0xFF6366F1),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateSheet,
        backgroundColor: const Color(0xFF6366F1),
        child: const Icon(Icons.add, color: Colors.white),
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }
}
