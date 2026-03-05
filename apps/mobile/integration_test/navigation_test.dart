import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

/// VitaMind mobile app integration tests — Navigation structure.
///
/// These tests verify bottom navigation behavior and the "More" bottom
/// sheet without requiring a live Supabase connection. We build minimal
/// widget trees that mirror the real AppBottomNav and _MoreBottomSheet
/// components to validate structure and interaction.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Bottom navigation interactions', () {
    testWidgets('tapping More tab opens a bottom sheet', (tester) async {
      await tester.pumpWidget(_buildNavTestApp());
      await tester.pumpAndSettle();

      // Tap the "More" navigation destination (index 4)
      await tester.tap(find.text('More'));
      await tester.pumpAndSettle();

      // The bottom sheet should now be visible with the three tiles
      expect(find.text('AI Assistant'), findsOneWidget);
      expect(find.text('Planner'), findsOneWidget);
      expect(find.text('Settings'), findsOneWidget);
    });

    testWidgets('bottom sheet shows subtitles for each tile', (tester) async {
      await tester.pumpWidget(_buildNavTestApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('More'));
      await tester.pumpAndSettle();

      expect(find.text('Chat with your life coach'), findsOneWidget);
      expect(find.text('AI-generated daily plan'), findsOneWidget);
      expect(find.text('Profile, account, preferences'), findsOneWidget);
    });

    testWidgets('bottom sheet shows correct icons', (tester) async {
      await tester.pumpWidget(_buildNavTestApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('More'));
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.auto_awesome_outlined), findsOneWidget);
      expect(find.byIcon(Icons.calendar_today_outlined), findsOneWidget);
      expect(find.byIcon(Icons.settings_outlined), findsOneWidget);
    });

    testWidgets('bottom sheet can be dismissed', (tester) async {
      await tester.pumpWidget(_buildNavTestApp());
      await tester.pumpAndSettle();

      // Open the sheet
      await tester.tap(find.text('More'));
      await tester.pumpAndSettle();
      expect(find.text('AI Assistant'), findsOneWidget);

      // Dismiss by tapping the barrier (scrim area above the sheet)
      // Using Navigator.pop via the close gesture
      await tester.tapAt(const Offset(200, 100));
      await tester.pumpAndSettle();

      expect(find.text('AI Assistant'), findsNothing);
    });

    testWidgets('tapping AI Assistant tile in bottom sheet triggers callback',
        (tester) async {
      String? navigatedTo;

      await tester.pumpWidget(_buildNavTestApp(
        onNavigate: (route) => navigatedTo = route,
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.text('More'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('AI Assistant'));
      await tester.pumpAndSettle();

      expect(navigatedTo, '/ai');
    });

    testWidgets('tapping Planner tile triggers callback', (tester) async {
      String? navigatedTo;

      await tester.pumpWidget(_buildNavTestApp(
        onNavigate: (route) => navigatedTo = route,
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.text('More'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Planner'));
      await tester.pumpAndSettle();

      expect(navigatedTo, '/planner');
    });

    testWidgets('tapping Settings tile triggers callback', (tester) async {
      String? navigatedTo;

      await tester.pumpWidget(_buildNavTestApp(
        onNavigate: (route) => navigatedTo = route,
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.text('More'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Settings'));
      await tester.pumpAndSettle();

      expect(navigatedTo, '/settings');
    });
  });

  group('Navigation bar structure', () {
    testWidgets('selecting different tabs updates selectedIndex',
        (tester) async {
      int selectedIndex = 0;

      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) {
            return MaterialApp(
              theme: ThemeData.dark(),
              home: Scaffold(
                body: Center(
                  child: Text('Tab $selectedIndex'),
                ),
                bottomNavigationBar: NavigationBar(
                  selectedIndex: selectedIndex,
                  onDestinationSelected: (i) {
                    setState(() => selectedIndex = i);
                  },
                  destinations: const [
                    NavigationDestination(
                      icon: Icon(Icons.home_outlined),
                      label: 'Home',
                    ),
                    NavigationDestination(
                      icon: Icon(Icons.task_alt_outlined),
                      label: 'Tasks',
                    ),
                    NavigationDestination(
                      icon: Icon(Icons.loop_outlined),
                      label: 'Habits',
                    ),
                    NavigationDestination(
                      icon: Icon(Icons.flag_outlined),
                      label: 'Goals',
                    ),
                    NavigationDestination(
                      icon: Icon(Icons.more_horiz_rounded),
                      label: 'More',
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      );
      await tester.pumpAndSettle();

      // Tap Tasks tab
      await tester.tap(find.text('Tasks'));
      await tester.pumpAndSettle();

      expect(find.text('Tab 1'), findsOneWidget);

      // Tap Habits tab
      await tester.tap(find.text('Habits'));
      await tester.pumpAndSettle();

      expect(find.text('Tab 2'), findsOneWidget);

      // Tap Goals tab
      await tester.tap(find.text('Goals'));
      await tester.pumpAndSettle();

      expect(find.text('Tab 3'), findsOneWidget);
    });
  });
}

// ---------------------------------------------------------------------------
// Test widget builders
// ---------------------------------------------------------------------------

/// Builds a test app with bottom navigation that opens a "More" bottom
/// sheet when the last tab is tapped, mirroring AppBottomNav behavior.
Widget _buildNavTestApp({void Function(String route)? onNavigate}) {
  return MaterialApp(
    theme: ThemeData.dark(),
    home: _NavTestHome(onNavigate: onNavigate),
  );
}

class _NavTestHome extends StatelessWidget {
  final void Function(String route)? onNavigate;
  const _NavTestHome({this.onNavigate});

  void _showMoreSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _TestMoreBottomSheet(
        onNavigate: (route) {
          Navigator.of(context).pop();
          onNavigate?.call(route);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: const Center(child: Text('Dashboard')),
      bottomNavigationBar: NavigationBar(
        selectedIndex: 0,
        onDestinationSelected: (i) {
          if (i == 4) {
            _showMoreSheet(context);
          }
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.task_alt_outlined),
            selectedIcon: Icon(Icons.task_alt_rounded),
            label: 'Tasks',
          ),
          NavigationDestination(
            icon: Icon(Icons.loop_outlined),
            selectedIcon: Icon(Icons.loop_rounded),
            label: 'Habits',
          ),
          NavigationDestination(
            icon: Icon(Icons.flag_outlined),
            selectedIcon: Icon(Icons.flag_rounded),
            label: 'Goals',
          ),
          NavigationDestination(
            icon: Icon(Icons.more_horiz_rounded),
            selectedIcon: Icon(Icons.more_horiz_rounded),
            label: 'More',
          ),
        ],
      ),
    );
  }
}

/// Test version of the "More" bottom sheet, mirroring _MoreBottomSheet
/// from app_bottom_nav.dart.
class _TestMoreBottomSheet extends StatelessWidget {
  final void Function(String route) onNavigate;
  const _TestMoreBottomSheet({required this.onNavigate});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey[900],
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag handle
            Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            _TestMoreTile(
              icon: Icons.auto_awesome_outlined,
              label: 'AI Assistant',
              subtitle: 'Chat with your life coach',
              onTap: () => onNavigate('/ai'),
            ),
            _TestMoreTile(
              icon: Icons.calendar_today_outlined,
              label: 'Planner',
              subtitle: 'AI-generated daily plan',
              onTap: () => onNavigate('/planner'),
            ),
            _TestMoreTile(
              icon: Icons.settings_outlined,
              label: 'Settings',
              subtitle: 'Profile, account, preferences',
              onTap: () => onNavigate('/settings'),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

class _TestMoreTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;

  const _TestMoreTile({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        child: Row(
          children: [
            Icon(icon, size: 20),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 12, color: Colors.white54),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, size: 20),
          ],
        ),
      ),
    );
  }
}
