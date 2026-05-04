package com.studentplatform.backend.entity;

public enum Role {
    ADMIN,
    FACULTY,
    STUDENT;

    public boolean isStaff() {
        return this == ADMIN || this == FACULTY;
    }

    public static Role fromValue(String value) {
        if (value == null) {
            return STUDENT;
        }

        return switch (value.trim().toUpperCase()) {
            case "ADMIN" -> ADMIN;
            case "FACULTY", "TEACHER" -> FACULTY;
            case "STUDENT" -> STUDENT;
            default -> throw new IllegalArgumentException("Unknown role: " + value);
        };
    }
}
