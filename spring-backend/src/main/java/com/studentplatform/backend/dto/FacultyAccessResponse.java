package com.studentplatform.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studentplatform.backend.entity.UserEntity;

import java.time.Instant;

public record FacultyAccessResponse(
        @JsonProperty("_id") String internalId,
        String id,
        String name,
        String email,
        String role,
        String createdAt,
        boolean accessBlocked,
        String accessBlockedUntil,
        String accessBlockReason
) {
    public static FacultyAccessResponse from(UserEntity user) {
        Instant now = Instant.now();
        Instant blockedUntil = user.getAccessBlockedUntil();
        boolean blocked = user.hasActiveAccessBlock(now);
        return new FacultyAccessResponse(
                user.getId(),
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name().toLowerCase(),
                user.getCreatedAt() == null ? null : user.getCreatedAt().toString(),
                blocked,
                blocked ? blockedUntil.toString() : null,
                blocked ? user.getAccessBlockReason() : null
        );
    }

    public static FacultyAccessResponse fromRaw(
            String id,
            String name,
            String email,
            String role,
            Instant createdAt,
            Instant accessBlockedUntil,
            String accessBlockReason
    ) {
        Instant now = Instant.now();
        boolean blocked = accessBlockedUntil != null && accessBlockedUntil.isAfter(now);
        return new FacultyAccessResponse(
                id,
                id,
                name,
                email,
                role == null || role.isBlank() ? "faculty" : role.trim().toLowerCase(),
                createdAt == null ? null : createdAt.toString(),
                blocked,
                blocked ? accessBlockedUntil.toString() : null,
                blocked ? accessBlockReason : null
        );
    }
}
