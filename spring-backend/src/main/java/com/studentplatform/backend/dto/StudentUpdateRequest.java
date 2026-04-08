package com.studentplatform.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StudentUpdateRequest(
        @NotBlank @Size(min = 2, max = 50) String name,
        @Email @NotBlank String email,
        String grade
) {
}
