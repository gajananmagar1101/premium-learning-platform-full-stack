package com.studentplatform.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record VerificationEmailRequest(
        @Email @NotBlank String email
) {
}
