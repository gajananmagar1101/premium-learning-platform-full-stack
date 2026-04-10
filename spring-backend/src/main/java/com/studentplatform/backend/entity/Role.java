package com.studentplatform.backend.entity;

public enum Role {
    ADMIN,
    STUDENT;

    public static Role fromValue(String value) {
        if (value == null) {
            return STUDENT;
        }

        return switch (value.trim().toUpperCase()) {
            case "ADMIN" -> ADMIN;
            case "STUDENT" -> STUDENT;
            default -> throw new IllegalArgumentException("Unknown role: " + value);
        };
    }
}
