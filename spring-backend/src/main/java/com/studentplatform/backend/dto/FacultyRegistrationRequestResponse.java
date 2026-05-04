package com.studentplatform.backend.dto;

import com.studentplatform.backend.entity.PendingRegistrationEntity;

public record FacultyRegistrationRequestResponse(
        String id,
        String name,
        String email,
        String role,
        boolean emailVerified,
        String approvalStatus,
        String requestedAt,
        String updatedAt
) {
    public static FacultyRegistrationRequestResponse from(PendingRegistrationEntity entity) {
        return new FacultyRegistrationRequestResponse(
                entity.getId(),
                entity.getName(),
                entity.getEmail(),
                entity.getRole() == null ? "student" : entity.getRole().name().toLowerCase(),
                entity.isEmailVerified(),
                entity.getApprovalStatus() == null ? null : entity.getApprovalStatus().name().toLowerCase(),
                entity.getCreatedAt() == null ? null : entity.getCreatedAt().toString(),
                entity.getUpdatedAt() == null ? null : entity.getUpdatedAt().toString()
        );
    }
}
