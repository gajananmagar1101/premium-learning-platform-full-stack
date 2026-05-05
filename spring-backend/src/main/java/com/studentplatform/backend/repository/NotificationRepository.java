package com.studentplatform.backend.repository;

import com.studentplatform.backend.entity.NotificationEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends MongoRepository<NotificationEntity, String> {
    List<NotificationEntity> findByRecipientIdOrderByCreatedAtDesc(String recipientId);
    List<NotificationEntity> findTop50ByRecipientIdOrderByCreatedAtDesc(String recipientId);
    Optional<NotificationEntity> findByIdAndRecipientId(String id, String recipientId);
    void deleteByRecipientId(String recipientId);
}
