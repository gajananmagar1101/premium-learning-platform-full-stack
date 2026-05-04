package com.studentplatform.backend.dto;

public record SimpleMessageResponse(
        boolean success,
        String message,
        String email,
        boolean pendingVerification,
        boolean pendingApproval,
        String role
) {
}
