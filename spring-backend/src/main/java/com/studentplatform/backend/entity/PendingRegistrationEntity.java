package com.studentplatform.backend.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "pending_registrations")
public class PendingRegistrationEntity {

    @Id
    private String id;

    private String name;

    private String email;

    private String passwordHash;

    private Role role = Role.STUDENT;

    private String grade = "";

    private String otpHash;

    private Instant otpExpiresAt;

    private Instant otpSentAt;

    private boolean emailVerified = false;

    private RegistrationApprovalStatus approvalStatus;

    private Instant createdAt;

    private Instant updatedAt;

    public void prepareForSave() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
        if (email != null) {
            email = email.trim().toLowerCase();
        }
        if (grade == null) {
            grade = "";
        }
        if (role == null) {
            role = Role.STUDENT;
        }
        if (role != Role.FACULTY) {
            approvalStatus = null;
        } else if (approvalStatus == null) {
            approvalStatus = RegistrationApprovalStatus.PENDING;
        }
    }

    public String getId() {
        return id;
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

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
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

    public String getOtpHash() {
        return otpHash;
    }

    public void setOtpHash(String otpHash) {
        this.otpHash = otpHash;
    }

    public Instant getOtpExpiresAt() {
        return otpExpiresAt;
    }

    public void setOtpExpiresAt(Instant otpExpiresAt) {
        this.otpExpiresAt = otpExpiresAt;
    }

    public Instant getOtpSentAt() {
        return otpSentAt;
    }

    public void setOtpSentAt(Instant otpSentAt) {
        this.otpSentAt = otpSentAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public void setEmailVerified(boolean emailVerified) {
        this.emailVerified = emailVerified;
    }

    public RegistrationApprovalStatus getApprovalStatus() {
        return approvalStatus;
    }

    public void setApprovalStatus(RegistrationApprovalStatus approvalStatus) {
        this.approvalStatus = approvalStatus;
    }
}
