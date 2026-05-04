package com.studentplatform.backend.service;

import com.studentplatform.backend.entity.Role;
import com.studentplatform.backend.entity.UserEntity;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;
import java.util.Optional;

@Service
public class UserDocumentLookupService {

    private final MongoTemplate mongoTemplate;

    public UserDocumentLookupService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public Optional<UserEntity> findByEmail(String email) {
        Query query = new Query(Criteria.where("email").is(email.toLowerCase().trim()));
        return Optional.ofNullable(mongoTemplate.findOne(query, Document.class, "users"))
                .map(this::toUserEntity);
    }

    public Optional<UserEntity> findById(String id) {
        Query query = new Query(Criteria.where("_id").is(toObjectIdIfPossible(id)));
        Document document = mongoTemplate.findOne(query, Document.class, "users");
        if (document != null) {
            return Optional.of(toUserEntity(document));
        }

        Query fallbackQuery = new Query(Criteria.where("_id").is(id));
        return Optional.ofNullable(mongoTemplate.findOne(fallbackQuery, Document.class, "users"))
                .map(this::toUserEntity);
    }

    public UserEntity toUserEntity(Document document) {
        UserEntity user = new UserEntity();
        user.setId(resolveId(document.get("_id")));
        user.setName(document.getString("name"));
        user.setEmail(document.getString("email"));
        user.setPassword(document.getString("password"));
        user.setRole(Role.fromValue(document.getString("role")));
        user.setGrade(document.getString("grade"));
        user.setEmailVerified(Boolean.TRUE.equals(document.get("emailVerified")) || Boolean.TRUE.equals(document.get("isEmailVerified")));
        user.setEmailVerificationTokenHash(document.getString("emailVerificationTokenHash"));
        user.setEmailVerificationExpiresAt(toInstant(document.get("emailVerificationExpiresAt")));
        user.setEmailVerificationSentAt(toInstant(document.get("emailVerificationSentAt")));
        user.setAccessBlockedUntil(toInstant(document.get("accessBlockedUntil")));
        user.setAccessBlockReason(document.getString("accessBlockReason"));
        return user;
    }

    private Object toObjectIdIfPossible(String id) {
        return ObjectId.isValid(id) ? new ObjectId(id) : id;
    }

    private String resolveId(Object value) {
        if (value instanceof ObjectId objectId) {
            return objectId.toHexString();
        }
        return value == null ? null : String.valueOf(value);
    }

    private Instant toInstant(Object value) {
        if (value instanceof Instant instant) {
            return instant;
        }
        if (value instanceof Date date) {
            return date.toInstant();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Instant.parse(text);
            } catch (Exception ignored) {
                return null;
            }
        }
        return null;
    }
}
