package com.studentplatform.backend.service;

import com.studentplatform.backend.dto.FacultyRegistrationRequestResponse;
import com.studentplatform.backend.entity.PendingRegistrationEntity;
import com.studentplatform.backend.entity.RegistrationApprovalStatus;
import com.studentplatform.backend.entity.Role;
import com.studentplatform.backend.entity.UserEntity;
import com.studentplatform.backend.exception.ApiException;
import com.studentplatform.backend.repository.PendingRegistrationRepository;
import com.studentplatform.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class FacultyRegistrationRequestService {

    private final PendingRegistrationRepository pendingRegistrationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public FacultyRegistrationRequestService(
            PendingRegistrationRepository pendingRegistrationRepository,
            UserRepository userRepository,
            NotificationService notificationService
    ) {
        this.pendingRegistrationRepository = pendingRegistrationRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<FacultyRegistrationRequestResponse> getPendingRequests() {
        return pendingRegistrationRepository
                .findByRoleAndEmailVerifiedTrueAndApprovalStatusOrderByUpdatedAtDesc(
                        Role.FACULTY,
                        RegistrationApprovalStatus.PENDING
                )
                .stream()
                .map(FacultyRegistrationRequestResponse::from)
                .toList();
    }

    public FacultyRegistrationRequestResponse approve(String requestId) {
        PendingRegistrationEntity registration = getPendingFacultyRequest(requestId);
        if (userRepository.existsByEmail(registration.getEmail())) {
            pendingRegistrationRepository.delete(registration);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already registered.");
        }

        UserEntity user = new UserEntity();
        user.setName(registration.getName());
        user.setEmail(registration.getEmail());
        user.setPassword(registration.getPasswordHash());
        user.setRole(Role.FACULTY);
        user.setGrade("");
        user.setEmailVerified(true);
        user.setEmailVerificationTokenHash(null);
        user.setEmailVerificationExpiresAt(null);
        user.setEmailVerificationSentAt(registration.getOtpSentAt());
        user.prepareForSave();
        userRepository.save(user);

        registration.setApprovalStatus(RegistrationApprovalStatus.APPROVED);
        registration.prepareForSave();
        pendingRegistrationRepository.delete(registration);

        notificationService.notifyRole(
                Role.ADMIN,
                "Faculty request approved",
                registration.getName() + " can now access the faculty portal.",
                "success",
                null
        );

        return FacultyRegistrationRequestResponse.from(registration);
    }

    public FacultyRegistrationRequestResponse reject(String requestId) {
        PendingRegistrationEntity registration = getPendingFacultyRequest(requestId);
        registration.setApprovalStatus(RegistrationApprovalStatus.REJECTED);
        registration.prepareForSave();
        PendingRegistrationEntity saved = pendingRegistrationRepository.save(registration);
        return FacultyRegistrationRequestResponse.from(saved);
    }

    private PendingRegistrationEntity getPendingFacultyRequest(String requestId) {
        PendingRegistrationEntity registration = pendingRegistrationRepository.findById(requestId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Faculty registration request not found."));
        if (registration.getRole() != Role.FACULTY) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Faculty registration request not found.");
        }
        if (!registration.isEmailVerified()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Faculty email verification is not complete yet.");
        }
        if (registration.getApprovalStatus() != RegistrationApprovalStatus.PENDING) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This faculty registration request is no longer pending.");
        }
        return registration;
    }
}
