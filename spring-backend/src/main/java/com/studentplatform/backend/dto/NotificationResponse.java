package com.studentplatform.backend.dto;

import com.studentplatform.backend.entity.NotificationEntity;

import java.time.Instant;

public record NotificationResponse(
        String id,
        String title,
        String message,
        String type,
        String category,
        String actionUrl,
        boolean read,
        Instant createdAt
) {
    public static NotificationResponse from(NotificationEntity notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getType(),
                notification.getCategory(),
                notification.getActionUrl(),
                notification.isRead(),
                notification.getCreatedAt()
        );
    }
}
