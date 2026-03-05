import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

/// Bottom sheet that requires the user to type "DELETE" before confirming
/// account deletion — prevents accidental destructive actions.
class DeleteConfirmationSheet extends StatefulWidget {
  final Future<void> Function() onConfirm;

  const DeleteConfirmationSheet({
    super.key,
    required this.onConfirm,
  });

  @override
  State<DeleteConfirmationSheet> createState() =>
      _DeleteConfirmationSheetState();
}

class _DeleteConfirmationSheetState extends State<DeleteConfirmationSheet> {
  final _controller = TextEditingController();
  bool _confirmed = false;
  bool _processing = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      final match = _controller.text.trim().toUpperCase() == 'DELETE';
      if (match != _confirmed) setState(() => _confirmed = match);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(
          top: BorderSide(color: AppColors.border),
        ),
      ),
      padding: EdgeInsets.fromLTRB(
        24, 16, 24, MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.textTertiary,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),

          // Warning icon
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: AppColors.error.withValues(alpha: 0.25),
              ),
            ),
            child: const Icon(
              Icons.warning_amber_rounded,
              color: AppColors.error,
              size: 24,
            ),
          ),
          const SizedBox(height: 16),

          const Text(
            'Delete your account?',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'All your tasks, goals, habits, and data will be permanently removed. This cannot be undone.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.textTertiary,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 20),

          // Confirm input
          Text.rich(
            TextSpan(
              text: 'Type ',
              style: const TextStyle(
                color: AppColors.textTertiary,
                fontSize: 12,
              ),
              children: [
                TextSpan(
                  text: 'DELETE',
                  style: TextStyle(
                    color: AppColors.error,
                    fontWeight: FontWeight.w700,
                    fontFamily: 'monospace',
                  ),
                ),
                const TextSpan(text: ' to confirm'),
              ],
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _controller,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 16,
              fontFamily: 'monospace',
              letterSpacing: 4,
            ),
            decoration: const InputDecoration(
              hintText: 'DELETE',
              contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
          ),
          const SizedBox(height: 20),

          // Buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: (_confirmed && !_processing)
                      ? () async {
                          setState(() => _processing = true);
                          await widget.onConfirm();
                        }
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor:
                        _confirmed ? AppColors.error : AppColors.surfaceEl,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: AppColors.surfaceEl,
                    disabledForegroundColor: AppColors.textTertiary,
                  ),
                  child: _processing
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Delete'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
