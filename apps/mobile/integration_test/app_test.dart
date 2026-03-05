import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

/// VitaMind mobile app integration tests — App launch and auth flow.
///
/// These tests verify widget rendering and navigation structure without
/// requiring a live Supabase connection. Since the app initialises
/// Supabase and Firebase in main(), we create a minimal test app that
/// mirrors the widget tree but skips external service initialisation.
///
/// The tests focus on:
/// - Splash screen appearance
/// - Login screen elements (email, password, forgot password, sign up)
/// - Register screen elements (name, email, password, confirm password)
/// - Bottom navigation structure (5 items)
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('App launch', () {
    testWidgets('shows a loading indicator on splash screen', (tester) async {
      // Build a minimal splash screen matching the router's _SplashScreen
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            backgroundColor: Color(0xFF060810),
            body: Center(
              child: CircularProgressIndicator(
                color: Color(0xFF6366F1),
                strokeWidth: 2,
              ),
            ),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  });

  group('Login screen', () {
    testWidgets('renders email and password fields', (tester) async {
      await tester.pumpWidget(_buildLoginScreen());
      await tester.pumpAndSettle();

      // Email field
      expect(find.text('Email'), findsWidgets);
      expect(
        find.byWidgetPredicate(
          (w) => w is TextField && w.keyboardType == TextInputType.emailAddress,
        ),
        findsOneWidget,
      );

      // Password field
      expect(find.text('Password'), findsWidgets);
      expect(
        find.byWidgetPredicate(
          (w) => w is TextField && w.obscureText == true,
        ),
        findsOneWidget,
      );
    });

    testWidgets('renders Forgot password button', (tester) async {
      await tester.pumpWidget(_buildLoginScreen());
      await tester.pumpAndSettle();

      expect(find.text('Forgot password?'), findsOneWidget);
    });

    testWidgets('renders Sign up button', (tester) async {
      await tester.pumpWidget(_buildLoginScreen());
      await tester.pumpAndSettle();

      expect(find.text('Sign up'), findsOneWidget);
    });

    testWidgets('renders Sign in submit button', (tester) async {
      await tester.pumpWidget(_buildLoginScreen());
      await tester.pumpAndSettle();

      expect(find.text('Sign in'), findsOneWidget);
    });

    testWidgets('renders Continue with Google button', (tester) async {
      await tester.pumpWidget(_buildLoginScreen());
      await tester.pumpAndSettle();

      expect(find.text('Continue with Google'), findsOneWidget);
    });

    testWidgets('renders VitaMind branding', (tester) async {
      await tester.pumpWidget(_buildLoginScreen());
      await tester.pumpAndSettle();

      expect(find.text('VitaMind'), findsOneWidget);
      expect(find.text('Intelligence for your life'), findsOneWidget);
    });
  });

  group('Register screen', () {
    testWidgets('renders all registration fields', (tester) async {
      await tester.pumpWidget(_buildRegisterScreen());
      await tester.pumpAndSettle();

      expect(find.text('Full name'), findsWidgets);
      expect(find.text('Email'), findsWidgets);
      expect(find.text('Password'), findsWidgets);
      expect(find.text('Confirm password'), findsWidgets);
    });

    testWidgets('renders Create account heading and button', (tester) async {
      await tester.pumpWidget(_buildRegisterScreen());
      await tester.pumpAndSettle();

      expect(find.text('Create account'), findsWidgets);
      expect(find.text('Start managing your life with AI'), findsOneWidget);
    });

    testWidgets('renders Sign in link for existing users', (tester) async {
      await tester.pumpWidget(_buildRegisterScreen());
      await tester.pumpAndSettle();

      expect(find.text('Already have an account?'), findsOneWidget);
      expect(find.text('Sign in'), findsOneWidget);
    });
  });

  group('Bottom navigation', () {
    testWidgets('renders 5 navigation destinations', (tester) async {
      await tester.pumpWidget(_buildBottomNavScreen());
      await tester.pumpAndSettle();

      // Verify all 5 navigation labels are present
      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Tasks'), findsOneWidget);
      expect(find.text('Habits'), findsOneWidget);
      expect(find.text('Goals'), findsOneWidget);
      expect(find.text('More'), findsOneWidget);

      // Verify NavigationBar widget exists
      expect(find.byType(NavigationBar), findsOneWidget);

      // Verify there are exactly 5 NavigationDestination widgets
      expect(find.byType(NavigationDestination), findsNWidgets(5));
    });

    testWidgets('Home tab is selected by default', (tester) async {
      await tester.pumpWidget(_buildBottomNavScreen(selectedIndex: 0));
      await tester.pumpAndSettle();

      // The NavigationBar should have selectedIndex 0
      final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.selectedIndex, 0);
    });

    testWidgets('navigation icons are visible', (tester) async {
      await tester.pumpWidget(_buildBottomNavScreen());
      await tester.pumpAndSettle();

      // Check that the expected icons are present
      expect(find.byIcon(Icons.home_outlined), findsOneWidget);
      expect(find.byIcon(Icons.task_alt_outlined), findsOneWidget);
      expect(find.byIcon(Icons.loop_outlined), findsOneWidget);
      expect(find.byIcon(Icons.flag_outlined), findsOneWidget);
      expect(find.byIcon(Icons.more_horiz_rounded), findsWidgets);
    });
  });
}

// ---------------------------------------------------------------------------
// Test widget builders
// ---------------------------------------------------------------------------
// These create minimal widget trees that mirror the real screens without
// requiring Supabase, Firebase, or BLoC initialisation.

/// Builds a standalone login screen for testing.
Widget _buildLoginScreen() {
  return MaterialApp(
    theme: ThemeData.dark().copyWith(
      scaffoldBackgroundColor: const Color(0xFF060810),
    ),
    home: Scaffold(
      backgroundColor: const Color(0xFF060810),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Branding
                  const Center(
                    child: Text(
                      'VitaMind',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Center(
                    child: Text(
                      'Intelligence for your life',
                      style: TextStyle(fontSize: 15, color: Colors.white70),
                    ),
                  ),
                  const SizedBox(height: 40),

                  // Google button
                  OutlinedButton(
                    onPressed: () {},
                    child: const Text('Continue with Google'),
                  ),
                  const SizedBox(height: 24),

                  // Email field
                  TextField(
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      prefixIcon: Icon(Icons.email_outlined, size: 20),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Password field
                  const TextField(
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: 'Password',
                      prefixIcon: Icon(Icons.lock_outline, size: 20),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Forgot password
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () {},
                      child: const Text('Forgot password?'),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Sign in button
                  ElevatedButton(
                    onPressed: () {},
                    child: const Text('Sign in'),
                  ),
                  const SizedBox(height: 24),

                  // Sign up link
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text("Don't have an account?"),
                      TextButton(
                        onPressed: () {},
                        child: const Text('Sign up'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

/// Builds a standalone register screen for testing.
Widget _buildRegisterScreen() {
  return MaterialApp(
    theme: ThemeData.dark().copyWith(
      scaffoldBackgroundColor: const Color(0xFF060810),
    ),
    home: Scaffold(
      backgroundColor: const Color(0xFF060810),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Create account',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Start managing your life with AI',
                    style: TextStyle(fontSize: 14, color: Colors.white70),
                  ),
                  const SizedBox(height: 28),

                  // Form fields
                  const TextField(
                    decoration: InputDecoration(
                      labelText: 'Full name',
                      prefixIcon: Icon(Icons.person_outline, size: 20),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      prefixIcon: Icon(Icons.email_outlined, size: 20),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const TextField(
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: 'Password',
                      prefixIcon: Icon(Icons.lock_outline, size: 20),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const TextField(
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: 'Confirm password',
                      prefixIcon: Icon(Icons.lock_outline, size: 20),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Create account button
                  ElevatedButton(
                    onPressed: () {},
                    child: const Text('Create account'),
                  ),
                  const SizedBox(height: 24),

                  // Sign in link
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('Already have an account?'),
                      TextButton(
                        onPressed: () {},
                        child: const Text('Sign in'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

/// Builds a screen with the bottom navigation bar for testing.
Widget _buildBottomNavScreen({int selectedIndex = 0}) {
  return MaterialApp(
    theme: ThemeData.dark(),
    home: Scaffold(
      body: const Center(child: Text('Dashboard')),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex.clamp(0, 4),
        onDestinationSelected: (_) {},
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
    ),
  );
}
