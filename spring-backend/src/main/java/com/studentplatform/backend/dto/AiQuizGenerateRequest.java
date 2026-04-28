package com.studentplatform.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AiQuizGenerateRequest(
        @NotBlank(message = "Subject is required.")
        String subject,
        @NotBlank(message = "Topic is required.")
        String topic,
        @NotBlank(message = "Difficulty is required.")
        String difficulty,
        @NotNull(message = "Number of questions is required.")
        @Min(value = 1, message = "At least 1 question is required.")
        @Max(value = 15, message = "At most 15 questions can be generated at once.")
        Integer questionCount
) {
}
