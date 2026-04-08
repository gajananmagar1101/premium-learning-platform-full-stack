package com.studentplatform.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ScoreAssignmentRequest(
        @NotBlank String studentId,
        @NotBlank String assessmentId,
        @NotNull @Min(0) Integer score,
        String feedback
) {
}
