package com.studentplatform.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyOtpRequest(
        @Email @NotBlank String email,
        @NotBlank
        @Pattern(regexp = "\\d{6}", message = "OTP must be a 6-digit code.")
        String otp
) {
}
