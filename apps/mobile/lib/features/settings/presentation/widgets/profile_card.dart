import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/glass_card.dart';

/// Profile editing card showing avatar, name field, and save button.
class ProfileCard extends StatelessWidget {
  final String email;
  final String? avatarUrl;
  final String originalName;
  final TextEditingController nameController;
  final bool saving;
  final String? statusMessage;
  final bool isError;
  final bool hasChanges;
  final VoidCallback onSave;
  final VoidCallback onChanged;

  const ProfileCard({
    super.key,
    required this.email,
    this.avatarUrl,
    required this.originalName,
    required this.nameController,
    required this.saving,
    this.statusMessage,
    required this.isError,
    required this.hasChanges,
    required this.onSave,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _buildAvatar(),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      originalName.isNotEmpty ? originalName : 'No name set',
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      email,
                      style: const TextStyle(color: AppColors.textTertiary, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          const Text(
            'Display name',
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: nameController,
            onChanged: (_) => onChanged(),
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
            decoration: const InputDecoration(
              hintText: 'Your name',
              contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
          ),
          const SizedBox(height: 12),
          if (statusMessage != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                statusMessage!,
                style: TextStyle(
                  color: isError ? AppColors.error : AppColors.success,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          Align(
            alignment: Alignment.centerRight,
            child: ElevatedButton(
              onPressed: (hasChanges && !saving) ? onSave : null,
              child: saving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Save'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvatar() {
    if (avatarUrl != null && avatarUrl!.isNotEmpty) {
      return CircleAvatar(
        radius: 28,
        backgroundImage: NetworkImage(avatarUrl!),
        backgroundColor: AppColors.surfaceEl,
      );
    }
    return Container(
      width: 56,
      height: 56,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.secondary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Text(
          originalName.isNotEmpty ? originalName[0].toUpperCase() : '?',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
