package com.studentplatform.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(min = 2, max = 50) String name,
        @Email @NotBlank String email,
        @NotBlank @Size(min = 6) String password,
        String role,
        String grade
) {
}
