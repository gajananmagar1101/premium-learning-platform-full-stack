package com.studentplatform.backend.dto;

public record AuthResponse(
        boolean success,
        String token,
        UserResponse user
) {
}
