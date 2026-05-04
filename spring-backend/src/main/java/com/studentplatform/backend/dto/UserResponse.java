package com.studentplatform.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studentplatform.backend.entity.UserEntity;

import java.time.Instant;

public record UserResponse(
        @JsonProperty("_id") String internalId,
        String id,
        String name,
        String email,
        String role,
        String grade,
        String createdAt,
        boolean accessBlocked,
        String accessBlockedUntil,
        String accessBlockReason
) {
    public static UserResponse from(UserEntity user) {
        String id = user.getId().toString();
        Instant blockedUntil = user.getAccessBlockedUntil();
        boolean blocked = user.hasActiveAccessBlock(Instant.now());
        return new UserResponse(
                id,
                id,
                user.getName(),
                user.getEmail(),
                user.getRole().name().toLowerCase(),
                user.getGrade(),
                user.getCreatedAt().toString(),
                blocked,
                blockedUntil == null ? null : blockedUntil.toString(),
                blocked ? user.getAccessBlockReason() : null
        );
    }
}
