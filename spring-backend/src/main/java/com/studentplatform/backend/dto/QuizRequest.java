package com.studentplatform.backend.dto;

import java.time.Instant;
import java.util.List;

public record QuizRequest(
        String title,
        String subjectId,
        String subject,
        String className,
        String description,
        Instant deadlineAt,
        Integer durationMinutes,
        String status,
        List<QuizQuestionRequest> questions
) {
    public record QuizQuestionRequest(
            String id,
            String prompt,
            List<String> options,
            Integer correctOption,
            Integer points
    ) {}
}
