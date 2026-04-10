package com.studentplatform.backend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record AssignmentRequest(
        @NotBlank String title,
        @NotBlank String subject,
        @JsonProperty("className")
        @JsonAlias({"class", "grade"})
        @NotBlank String className,
        @NotBlank String description,
        @NotNull @Min(1) Integer totalMarks,
        @NotNull @Future LocalDateTime deadline,
        String questionFileName,
        String questionFileContent
) {
}
