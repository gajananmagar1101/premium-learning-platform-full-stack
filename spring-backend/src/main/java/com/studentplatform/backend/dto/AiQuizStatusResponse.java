package com.studentplatform.backend.dto;

public record AiQuizStatusResponse(
        boolean enabled,
        boolean configured,
        boolean available,
        int maxQuestionCount,
        String message
) {
}
