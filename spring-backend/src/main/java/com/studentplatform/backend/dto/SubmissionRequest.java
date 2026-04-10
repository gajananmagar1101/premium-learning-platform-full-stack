package com.studentplatform.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record SubmissionRequest(
        @NotBlank String assignmentId,
        String content,
        String fileName,
        String fileContent
) {
}
