package com.studentplatform.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateSubjectRequest(
        @NotBlank(message = "Subject name is required.") String name,
        @NotBlank(message = "Year is required.") String yearId
) {
}
