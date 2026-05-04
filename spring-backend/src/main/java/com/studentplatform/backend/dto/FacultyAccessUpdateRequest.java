package com.studentplatform.backend.dto;

public record FacultyAccessUpdateRequest(
        String blockedUntil,
        String reason
) {
}
