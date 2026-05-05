package com.studentplatform.backend.service;

import com.studentplatform.backend.dto.NotificationResponse;
import com.studentplatform.backend.entity.NotificationEntity;
import com.studentplatform.backend.entity.Role;
import com.studentplatform.backend.entity.UserEntity;
import com.studentplatform.backend.exception.ApiException;
import com.studentplatform.backend.repository.NotificationRepository;
import com.studentplatform.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@Transactional
public class NotificationService {

    private static final int MAX_PER_USER = 50;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(UserEntity currentUser) {
        return notificationRepository.findTop50ByRecipientIdOrderByCreatedAtDesc(currentUser.getId()).stream()
                .map(NotificationResponse::from)
                .toList();
    }

    public NotificationResponse markRead(String id, UserEntity currentUser) {
        NotificationEntity notification = notificationRepository.findByIdAndRecipientId(id, currentUser.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Notification not found."));
        notification.setRead(true);
        notification.setReadAt(Instant.now());
        return NotificationResponse.from(notificationRepository.save(notification));
    }

    public void markAllRead(UserEntity currentUser) {
        List<NotificationEntity> notifications = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(currentUser.getId());
        Instant now = Instant.now();
        for (NotificationEntity notification : notifications) {
            if (!notification.isRead()) {
                notification.setRead(true);
                notification.setReadAt(now);
            }
        }
        notificationRepository.saveAll(notifications);
    }

    public void delete(String id, UserEntity currentUser) {
        NotificationEntity notification = notificationRepository.findByIdAndRecipientId(id, currentUser.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Notification not found."));
        notificationRepository.delete(notification);
    }

    @Async("notificationExecutor")
    public void notifyUsersByIds(List<String> recipientIds, String title, String message, String type, String actorUserId) {
        saveNotifications(recipientIds, title, message, type, actorUserId);
    }

    @Async("notificationExecutor")
    public void notifyRole(Role role, String title, String message, String type, String actorUserId) {
        List<String> recipientIds = userRepository.findAllByRoleOrderByCreatedAtDesc(role).stream()
                .map(UserEntity::getId)
                .toList();
        saveNotifications(recipientIds, title, message, type, actorUserId);
    }

    @Async("notificationExecutor")
    public void notifyStaff(String title, String message, String type, String actorUserId) {
        List<String> recipientIds = userRepository.findByRoleInOrderByCreatedAtDesc(List.of(Role.ADMIN, Role.FACULTY)).stream()
                .map(UserEntity::getId)
                .toList();
        saveNotifications(recipientIds, title, message, type, actorUserId);
    }

    @Async("notificationExecutor")
    public void notifyStudentsByGrade(String grade, String title, String message, String type, String actorUserId) {
        String targetGrade = grade == null ? "" : grade.trim();
        if (targetGrade.isBlank()) return;

        List<String> recipientIds = userRepository.findByRoleAndGradeIgnoreCaseOrderByCreatedAtDesc(Role.STUDENT, targetGrade).stream()
                .map(UserEntity::getId)
                .toList();
        saveNotifications(recipientIds, title, message, type, actorUserId);
    }

    private void saveNotifications(List<String> recipientIds, String title, String message, String type, String actorUserId) {
        if (recipientIds == null || recipientIds.isEmpty()) {
            return;
        }

        Set<String> uniqueRecipients = new HashSet<>();
        for (String recipientId : recipientIds) {
            if (recipientId == null || recipientId.isBlank()) continue;
            if (actorUserId != null && actorUserId.equals(recipientId)) continue;
            uniqueRecipients.add(recipientId);
        }
        if (uniqueRecipients.isEmpty()) {
            return;
        }

        List<NotificationEntity> batch = new ArrayList<>();
        for (String recipientId : uniqueRecipients) {
            NotificationEntity notification = new NotificationEntity();
            notification.setRecipientId(recipientId);
            notification.setTitle(title);
            notification.setMessage(message);
            notification.setType(type);
            notification.setRead(false);
            notification.prepareForSave();
            batch.add(notification);
        }
        notificationRepository.saveAll(batch);
    }
}
