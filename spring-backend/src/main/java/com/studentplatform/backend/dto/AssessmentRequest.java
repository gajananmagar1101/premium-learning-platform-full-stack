package com.studentplatform.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AssessmentRequest(
        @NotBlank String title,
        @NotBlank String subject,
        @NotBlank String date,
        @NotNull @Min(1) Integer maxScore,
        @NotBlank String status
) {
}
