import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_bottom_nav.dart';
import '../../../../core/widgets/glass_card.dart';
import '../../data/timeline_service.dart';

/// Displays the user's life timeline -- a chronological feed of tasks
/// completed, goals reached, habits logged, milestones, and free-form notes.
class TimelineScreen extends StatefulWidget {
  const TimelineScreen({super.key});

  @override
  State<TimelineScreen> createState() => _TimelineScreenState();
}

class _TimelineScreenState extends State<TimelineScreen> {
  final _service = TimelineService();
  final _scrollController = ScrollController();
  final _searchController = TextEditingController();

  List<LifeEvent> _events = [];
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = true;
  String? _error;
  int _page = 1;

  /// Currently active filter type. Null means "All".
  String? _activeFilter;

  /// When non-null the list shows search results instead of the feed.
  String? _searchQuery;

  static const _pageSize = 20;

  // ── Filter chip definitions ──────────────────────────────────────────────

  static const _filters = <_FilterDef>[
    _FilterDef(label: 'All', value: null),
    _FilterDef(label: 'Tasks', value: 'task_completed'),
    _FilterDef(label: 'Goals', value: 'goal_achieved'),
    _FilterDef(label: 'Habits', value: 'habit_streak'),
    _FilterDef(label: 'Milestones', value: 'milestone'),
    _FilterDef(label: 'Notes', value: 'note'),
  ];

  // ── Lifecycle ────────────────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _load();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  // ── Data loading ─────────────────────────────────────────────────────────

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _page = 1;
      _hasMore = true;
    });

    try {
      final events = await _service.getEvents(
        page: 1,
        limit: _pageSize,
        type: _activeFilter,
      );

      if (!mounted) return;
      setState(() {
        _events = events;
        _loading = false;
        _hasMore = events.length >= _pageSize;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _loadNextPage() async {
    if (_loadingMore || !_hasMore || _searchQuery != null) return;

    setState(() => _loadingMore = true);
    final nextPage = _page + 1;

    try {
      final events = await _service.getEvents(
        page: nextPage,
        limit: _pageSize,
        type: _activeFilter,
      );

      if (!mounted) return;
      setState(() {
        _page = nextPage;
        _events.addAll(events);
        _loadingMore = false;
        _hasMore = events.length >= _pageSize;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadingMore = false);
      _showSnack('Failed to load more events');
    }
  }

  Future<void> _search(String query) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty) {
      setState(() => _searchQuery = null);
      _load();
      return;
    }

    setState(() {
      _searchQuery = trimmed;
      _loading = true;
      _error = null;
    });

    try {
      final results = await _service.searchEvents(trimmed);
      if (!mounted) return;
      setState(() {
        _events = results;
        _loading = false;
        _hasMore = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _loadNextPage();
    }
  }

  void _onFilterChanged(String? type) {
    if (type == _activeFilter) return;
    // Clear search when switching filters.
    _searchController.clear();
    _searchQuery = null;
    _activeFilter = type;
    _load();
  }

  // ── Add event ────────────────────────────────────────────────────────────

  void _showAddSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AddEventSheet(
        onSave: _handleAddEvent,
      ),
    );
  }

  Future<void> _handleAddEvent(_NewEventData data) async {
    try {
      final event = await _service.addEvent(
        title: data.title,
        description: data.description,
        eventType: data.eventType,
        eventDate: data.eventDate?.toIso8601String(),
      );

      if (!mounted) return;
      // Optimistic insert at the top (or appropriate position).
      setState(() => _events.insert(0, event));
      _showSnack('Event added');
    } catch (e) {
      if (!mounted) return;
      _showSnack('Failed to add event');
    }
  }

  // ── Delete event ─────────────────────────────────────────────────────────

  Future<void> _deleteEvent(LifeEvent event) async {
    final index = _events.indexOf(event);
    setState(() => _events.remove(event));

    try {
      await _service.deleteEvent(event.id);
      if (!mounted) return;
      _showSnack('Event deleted');
    } catch (e) {
      if (!mounted) return;
      // Rollback on failure.
      setState(() => _events.insert(index.clamp(0, _events.length), event));
      _showSnack('Failed to delete event');
    }
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  // ── Build ────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: const Text('Life Timeline'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined, size: 20),
            color: AppColors.textSecondary,
            tooltip: 'Refresh',
            onPressed: () {
              _searchController.clear();
              _searchQuery = null;
              _load();
            },
          ),
        ],
      ),
      body: Column(
        children: [
          _buildSearchBar(),
          _buildFilterChips(),
          Expanded(child: _buildContent()),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddSheet,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add_rounded, color: Colors.white),
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
    );
  }

  // ── Search bar ───────────────────────────────────────────────────────────

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: TextField(
        controller: _searchController,
        style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
        decoration: InputDecoration(
          hintText: 'Search events...',
          prefixIcon: const Icon(Icons.search, size: 20,
              color: AppColors.textTertiary),
          suffixIcon: _searchQuery != null
              ? IconButton(
                  icon: const Icon(Icons.close, size: 18,
                      color: AppColors.textTertiary),
                  onPressed: () {
                    _searchController.clear();
                    _search('');
                  },
                )
              : null,
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(
              horizontal: 12, vertical: 10),
        ),
        textInputAction: TextInputAction.search,
        onSubmitted: _search,
      ),
    );
  }

  // ── Filter chips ─────────────────────────────────────────────────────────

  Widget _buildFilterChips() {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, index) {
          final f = _filters[index];
          final selected = f.value == _activeFilter;
          return ChoiceChip(
            label: Text(f.label),
            selected: selected,
            onSelected: (_) => _onFilterChanged(f.value),
            selectedColor: AppColors.primary.withValues(alpha: 0.2),
            labelStyle: TextStyle(
              fontSize: 13,
              color: selected ? AppColors.primary : AppColors.textSecondary,
              fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
            ),
            side: BorderSide(
              color: selected
                  ? AppColors.primary.withValues(alpha: 0.4)
                  : AppColors.border,
            ),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8)),
            showCheckmark: false,
            visualDensity: VisualDensity.compact,
          );
        },
      ),
    );
  }

  // ── Content area ─────────────────────────────────────────────────────────

  Widget _buildContent() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (_error != null) return _buildError();
    if (_events.isEmpty) return _buildEmpty();

    return _buildEventList();
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, color: AppColors.error, size: 40),
          const SizedBox(height: 12),
          Text('Failed to load timeline',
              style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _load, child: const Text('Retry')),
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    final isSearch = _searchQuery != null;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isSearch ? Icons.search_off_rounded : Icons.timeline_outlined,
              size: 56,
              color: AppColors.textTertiary.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 16),
            Text(
              isSearch ? 'No matching events' : 'Your timeline is empty',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              isSearch
                  ? 'Try a different search term or filter.'
                  : 'Complete tasks, reach goals, and log habits to build '
                      'your life timeline. You can also add milestones and '
                      'notes manually.',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  // ── Grouped event list ───────────────────────────────────────────────────

  Widget _buildEventList() {
    // Group events by display date label (Today, Yesterday, or formatted).
    final groups = _groupByDate(_events);

    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      backgroundColor: AppColors.surface,
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
        itemCount: groups.length + (_loadingMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == groups.length) {
            return const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Center(
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: AppColors.primary),
                ),
              ),
            );
          }

          final group = groups[index];
          return _DateGroup(
            label: group.label,
            events: group.events,
            onDelete: _deleteEvent,
          );
        },
      ),
    );
  }

  // ── Date grouping helpers ────────────────────────────────────────────────

  static List<_EventGroup> _groupByDate(List<LifeEvent> events) {
    final Map<String, List<LifeEvent>> buckets = {};
    final Map<String, DateTime> bucketDates = {};

    for (final event in events) {
      final label = _dateLabel(event.eventDate);
      buckets.putIfAbsent(label, () => []).add(event);
      // Keep the raw date for sort ordering.
      bucketDates.putIfAbsent(label, () => event.eventDate);
    }

    final groups = buckets.entries
        .map((e) => _EventGroup(label: e.key, events: e.value))
        .toList();

    // Order groups by their first event's date descending.
    groups.sort((a, b) {
      final da = bucketDates[a.label]!;
      final db = bucketDates[b.label]!;
      return db.compareTo(da);
    });

    return groups;
  }

  static String _dateLabel(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final eventDay = DateTime(date.year, date.month, date.day);

    if (eventDay == today) return 'Today';
    if (eventDay == today.subtract(const Duration(days: 1))) {
      return 'Yesterday';
    }
    return DateFormat('MMMM d, yyyy').format(date);
  }
}

// =============================================================================
// Private widgets
// =============================================================================

class _FilterDef {
  final String label;
  final String? value;
  const _FilterDef({required this.label, required this.value});
}

class _EventGroup {
  final String label;
  final List<LifeEvent> events;
  const _EventGroup({required this.label, required this.events});
}

/// A date section header followed by its event cards.
class _DateGroup extends StatelessWidget {
  final String label;
  final List<LifeEvent> events;
  final void Function(LifeEvent) onDelete;

  const _DateGroup({
    required this.label,
    required this.events,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 16, bottom: 8),
          child: Text(
            label,
            style: Theme.of(context)
                .textTheme
                .labelSmall
                ?.copyWith(color: AppColors.textTertiary, fontSize: 12),
          ),
        ),
        ...events.map((event) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: event.isDeletable
                  ? Dismissible(
                      key: ValueKey(event.id),
                      direction: DismissDirection.endToStart,
                      background: _dismissBackground(),
                      confirmDismiss: (_) => _confirmDelete(context),
                      onDismissed: (_) => onDelete(event),
                      child: _EventCard(event: event),
                    )
                  : _EventCard(event: event),
            )),
      ],
    );
  }

  Widget _dismissBackground() {
    return Container(
      alignment: Alignment.centerRight,
      padding: const EdgeInsets.only(right: 20),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(16),
      ),
      child: const Icon(Icons.delete_outline, color: AppColors.error),
    );
  }

  Future<bool> _confirmDelete(BuildContext context) async {
    return await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Delete event?'),
            content:
                const Text('This action cannot be undone.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(false),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(true),
                child: const Text('Delete',
                    style: TextStyle(color: AppColors.error)),
              ),
            ],
          ),
        ) ??
        false;
  }
}

/// A single event card displaying icon, title, optional description, and time.
class _EventCard extends StatelessWidget {
  final LifeEvent event;
  const _EventCard({required this.event});

  @override
  Widget build(BuildContext context) {
    final visual = _eventVisual(event.eventType);
    final timeStr = DateFormat('h:mm a').format(event.eventDate);

    return GlassCard(
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Type icon badge
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: visual.color.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(visual.icon, size: 18, color: visual.color),
          ),
          const SizedBox(width: 12),
          // Text content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.title,
                  style: Theme.of(context).textTheme.labelLarge,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (event.description != null &&
                    event.description!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    event.description!,
                    style: Theme.of(context).textTheme.bodyMedium,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Timestamp
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(
              timeStr,
              style: Theme.of(context)
                  .textTheme
                  .labelSmall
                  ?.copyWith(fontSize: 10, color: AppColors.textTertiary),
            ),
          ),
        ],
      ),
    );
  }

  static _EventVisual _eventVisual(String type) {
    switch (type) {
      case 'task_completed':
        return const _EventVisual(
          icon: Icons.check_circle_outlined,
          color: AppColors.success,
        );
      case 'goal_achieved':
        return const _EventVisual(
          icon: Icons.emoji_events_outlined,
          color: AppColors.warning,
        );
      case 'habit_streak':
        return const _EventVisual(
          icon: Icons.local_fire_department_outlined,
          color: Color(0xFFF97316), // orange-500
        );
      case 'milestone':
        return const _EventVisual(
          icon: Icons.star_outlined,
          color: AppColors.secondary,
        );
      case 'note':
        return const _EventVisual(
          icon: Icons.sticky_note_2_outlined,
          color: AppColors.accent,
        );
      default:
        return const _EventVisual(
          icon: Icons.circle_outlined,
          color: AppColors.textSecondary,
        );
    }
  }
}

class _EventVisual {
  final IconData icon;
  final Color color;
  const _EventVisual({required this.icon, required this.color});
}

// =============================================================================
// Add Event bottom sheet
// =============================================================================

/// Data transfer object from the add-event sheet to the parent.
class _NewEventData {
  final String title;
  final String? description;
  final String eventType;
  final DateTime? eventDate;

  const _NewEventData({
    required this.title,
    this.description,
    required this.eventType,
    this.eventDate,
  });
}

class _AddEventSheet extends StatefulWidget {
  final Future<void> Function(_NewEventData data) onSave;
  const _AddEventSheet({required this.onSave});

  @override
  State<_AddEventSheet> createState() => _AddEventSheetState();
}

class _AddEventSheetState extends State<_AddEventSheet> {
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _type = 'note';
  DateTime? _date;
  bool _saving = false;

  static const _typeOptions = <String, String>{
    'note': 'Note',
    'milestone': 'Milestone',
  };

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _submit() async {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) return;

    setState(() => _saving = true);

    await widget.onSave(_NewEventData(
      title: title,
      description:
          _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
      eventType: _type,
      eventDate: _date,
    ));

    if (!mounted) return;
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(
          top: BorderSide(color: AppColors.border),
          left: BorderSide(color: AppColors.border),
          right: BorderSide(color: AppColors.border),
        ),
      ),
      padding: EdgeInsets.fromLTRB(24, 16, 24, 16 + bottomInset),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.textTertiary.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text('Add Event',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 16),

          // Title
          TextField(
            controller: _titleCtrl,
            autofocus: true,
            style: const TextStyle(
                color: AppColors.textPrimary, fontSize: 14),
            decoration: const InputDecoration(
              hintText: 'What happened?',
              isDense: true,
            ),
            textCapitalization: TextCapitalization.sentences,
          ),
          const SizedBox(height: 12),

          // Description
          TextField(
            controller: _descCtrl,
            style: const TextStyle(
                color: AppColors.textPrimary, fontSize: 14),
            decoration: const InputDecoration(
              hintText: 'Description (optional)',
              isDense: true,
            ),
            maxLines: 3,
            minLines: 1,
            textCapitalization: TextCapitalization.sentences,
          ),
          const SizedBox(height: 12),

          // Type + Date row
          Row(
            children: [
              // Type dropdown
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _type,
                  dropdownColor: AppColors.surfaceEl,
                  style: const TextStyle(
                      color: AppColors.textPrimary, fontSize: 14),
                  decoration: const InputDecoration(
                    labelText: 'Type',
                    isDense: true,
                  ),
                  items: _typeOptions.entries
                      .map((e) => DropdownMenuItem(
                            value: e.key,
                            child: Text(e.value),
                          ))
                      .toList(),
                  onChanged: (v) {
                    if (v != null) setState(() => _type = v);
                  },
                ),
              ),
              const SizedBox(width: 12),
              // Date picker button
              Expanded(
                child: InkWell(
                  onTap: _pickDate,
                  borderRadius: BorderRadius.circular(12),
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Date',
                      isDense: true,
                      suffixIcon: Icon(Icons.calendar_today_outlined,
                          size: 16, color: AppColors.textTertiary),
                    ),
                    child: Text(
                      _date != null
                          ? DateFormat('MMM d, yyyy').format(_date!)
                          : 'Today',
                      style: TextStyle(
                        fontSize: 14,
                        color: _date != null
                            ? AppColors.textPrimary
                            : AppColors.textTertiary,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Save button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Save'),
            ),
          ),
        ],
      ),
    );
  }
}
