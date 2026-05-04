package com.studentplatform.backend.dto;

public record StudentAccessUpdateRequest(
        String blockedUntil,
        String reason
) {
}
