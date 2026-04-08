package com.studentplatform.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studentplatform.backend.entity.UserEntity;

public record UserResponse(
        @JsonProperty("_id") String internalId,
        String id,
        String name,
        String email,
        String role,
        String grade,
        String createdAt
) {
    public static UserResponse from(UserEntity user) {
        String id = user.getId().toString();
        return new UserResponse(
                id,
                id,
                user.getName(),
                user.getEmail(),
                user.getRole().name().toLowerCase(),
                user.getGrade(),
                user.getCreatedAt().toString()
        );
    }
}
