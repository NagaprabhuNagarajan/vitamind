import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Animated in-app notification banner that slides in from the top of the
/// screen when a foreground FCM message arrives. Designed to match the
/// VitaMind dark theme with a primary accent left border.
class InAppNotificationBanner extends StatefulWidget {
  const InAppNotificationBanner({
    super.key,
    required this.title,
    required this.body,
    this.type,
    this.onTap,
    this.onDismissed,
    this.duration = const Duration(seconds: 4),
  });

  final String title;
  final String body;

  /// Notification type used to pick the leading icon (e.g. 'tasks', 'habits').
  final String? type;

  /// Called when the user taps the banner.
  final VoidCallback? onTap;

  /// Called after the banner has been dismissed (auto or swipe).
  final VoidCallback? onDismissed;

  /// How long the banner stays visible before auto-dismissing.
  final Duration duration;

  @override
  State<InAppNotificationBanner> createState() =>
      _InAppNotificationBannerState();
}

class _InAppNotificationBannerState extends State<InAppNotificationBanner>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<Offset> _slideAnimation;
  late final Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));

    _fadeAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    _controller.forward();
    _scheduleAutoDismiss();
  }

  void _scheduleAutoDismiss() {
    Future.delayed(widget.duration, () {
      if (mounted) _dismiss();
    });
  }

  Future<void> _dismiss() async {
    if (!mounted) return;
    await _controller.reverse();
    widget.onDismissed?.call();
  }

  IconData _iconForType(String? type) {
    switch (type) {
      case 'tasks':
        return Icons.check_circle_outline_rounded;
      case 'habits':
        return Icons.loop_rounded;
      default:
        // Brain/insight icon as the VitaMind default
        return Icons.psychology_rounded;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).viewPadding.top;

    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SlideTransition(
        position: _slideAnimation,
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Dismissible(
            key: UniqueKey(),
            direction: DismissDirection.up,
            onDismissed: (_) => widget.onDismissed?.call(),
            child: GestureDetector(
              onTap: () {
                widget.onTap?.call();
                _dismiss();
              },
              child: Container(
                margin: EdgeInsets.only(
                  top: topPadding + 8,
                  left: 12,
                  right: 12,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surfaceEl,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.35),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: IntrinsicHeight(
                  child: Row(
                    children: [
                      // Accent left strip
                      Container(
                        width: 4,
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.only(
                            topLeft: Radius.circular(14),
                            bottomLeft: Radius.circular(14),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Icon
                      Icon(
                        _iconForType(widget.type),
                        color: AppColors.primary,
                        size: 24,
                      ),
                      const SizedBox(width: 12),
                      // Text content
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                widget.title,
                                style: const TextStyle(
                                  color: AppColors.textPrimary,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (widget.body.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(
                                  widget.body,
                                  style: const TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 13,
                                    fontWeight: FontWeight.normal,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Close affordance
                      const Padding(
                        padding: EdgeInsets.only(right: 12),
                        child: Icon(
                          Icons.close_rounded,
                          color: AppColors.textTertiary,
                          size: 18,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
