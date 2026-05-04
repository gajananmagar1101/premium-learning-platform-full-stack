package com.studentplatform.backend.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "users")
public class UserEntity {

    @Id
    private String id;

    private String name;

    private String email;

    private String password;

    private Role role = Role.STUDENT;

    private String grade = "";

    private boolean emailVerified = false;

    private String emailVerificationTokenHash;

    private Instant emailVerificationExpiresAt;

    private Instant emailVerificationSentAt;

    private Instant createdAt;

    private Instant accessBlockedUntil;

    private String accessBlockReason;

    public void prepareForSave() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (email != null) {
            email = email.trim().toLowerCase();
        }
        if (grade == null) {
            grade = "";
        }
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public String getGrade() {
        return grade;
    }

    public void setGrade(String grade) {
        this.grade = grade;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getAccessBlockedUntil() {
        return accessBlockedUntil;
    }

    public void setAccessBlockedUntil(Instant accessBlockedUntil) {
        this.accessBlockedUntil = accessBlockedUntil;
    }

    public String getAccessBlockReason() {
        return accessBlockReason;
    }

    public void setAccessBlockReason(String accessBlockReason) {
        this.accessBlockReason = accessBlockReason;
    }

    public boolean hasActiveAccessBlock(Instant now) {
        return accessBlockedUntil != null && accessBlockedUntil.isAfter(now);
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public void setEmailVerified(boolean emailVerified) {
        this.emailVerified = emailVerified;
    }

    public String getEmailVerificationTokenHash() {
        return emailVerificationTokenHash;
    }

    public void setEmailVerificationTokenHash(String emailVerificationTokenHash) {
        this.emailVerificationTokenHash = emailVerificationTokenHash;
    }

    public Instant getEmailVerificationExpiresAt() {
        return emailVerificationExpiresAt;
    }

    public void setEmailVerificationExpiresAt(Instant emailVerificationExpiresAt) {
        this.emailVerificationExpiresAt = emailVerificationExpiresAt;
    }

    public Instant getEmailVerificationSentAt() {
        return emailVerificationSentAt;
    }

    public void setEmailVerificationSentAt(Instant emailVerificationSentAt) {
        this.emailVerificationSentAt = emailVerificationSentAt;
    }
}
