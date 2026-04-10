package com.studentplatform.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record GradeSubmissionRequest(
        @NotNull @Min(0) Integer marks
) {
}
