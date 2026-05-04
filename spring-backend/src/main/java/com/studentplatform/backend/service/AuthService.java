package com.studentplatform.backend.service;

import com.studentplatform.backend.dto.AuthResponse;
import com.studentplatform.backend.dto.LoginRequest;
import com.studentplatform.backend.dto.RegisterRequest;
import com.studentplatform.backend.dto.SimpleMessageResponse;
import com.studentplatform.backend.dto.UserResponse;
import com.studentplatform.backend.dto.VerificationEmailRequest;
import com.studentplatform.backend.dto.VerifyOtpRequest;
import com.studentplatform.backend.entity.PendingRegistrationEntity;
import com.studentplatform.backend.entity.RegistrationApprovalStatus;
import com.studentplatform.backend.entity.Role;
import com.studentplatform.backend.entity.UserEntity;
import com.studentplatform.backend.exception.ApiException;
import com.studentplatform.backend.repository.PendingRegistrationRepository;
import com.studentplatform.backend.repository.UserRepository;
import com.studentplatform.backend.security.AppUserDetails;
import com.studentplatform.backend.security.JwtService;
import com.studentplatform.backend.util.EmailAddressValidator;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final PendingRegistrationRepository pendingRegistrationRepository;
    private final EmailVerificationTokenService emailVerificationTokenService;
    private final EmailDeliveryService emailDeliveryService;
    private final NotificationService notificationService;
    private final UserDocumentLookupService userDocumentLookupService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            PendingRegistrationRepository pendingRegistrationRepository,
            EmailVerificationTokenService emailVerificationTokenService,
            EmailDeliveryService emailDeliveryService,
            NotificationService notificationService,
            UserDocumentLookupService userDocumentLookupService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.pendingRegistrationRepository = pendingRegistrationRepository;
        this.emailVerificationTokenService = emailVerificationTokenService;
        this.emailDeliveryService = emailDeliveryService;
        this.notificationService = notificationService;
        this.userDocumentLookupService = userDocumentLookupService;
    }

    public SimpleMessageResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        validateEmail(email);
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already registered.");
        }
        Role requestedRole = resolveRequestedRole(request.role());

        pendingRegistrationRepository.findByEmail(email).ifPresent(existing -> {
            if (existing.getApprovalStatus() == RegistrationApprovalStatus.PENDING) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "A faculty registration request is already pending for this email.");
            }
            pendingRegistrationRepository.delete(existing);
        });

        if (requestedRole == Role.FACULTY) {
            PendingRegistrationEntity registration = new PendingRegistrationEntity();
            registration.setName(request.name().trim());
            registration.setEmail(email);
            registration.setPasswordHash(passwordEncoder.encode(request.password()));
            registration.setRole(Role.FACULTY);
            registration.setGrade("");
            registration.setOtpHash(null);
            registration.setOtpExpiresAt(null);
            registration.setOtpSentAt(null);
            registration.setEmailVerified(true);
            registration.setApprovalStatus(RegistrationApprovalStatus.PENDING);
            registration.prepareForSave();

            PendingRegistrationEntity saved = pendingRegistrationRepository.save(registration);
            notificationService.notifyRole(
                    Role.ADMIN,
                    "New faculty registration request",
                    registration.getName() + " is waiting for faculty account approval.",
                    "info",
                    null
            );

            return new SimpleMessageResponse(
                    true,
                    "Faculty registration request submitted. Admin approval is required before login.",
                    saved.getEmail(),
                    false,
                    true,
                    requestedRole.name().toLowerCase()
            );
        }

        UserEntity user = new UserEntity();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(Role.STUDENT);
        user.setGrade(request.grade() == null ? "" : request.grade().trim());
        user.setEmailVerified(true);
        user.setEmailVerificationTokenHash(null);
        user.setEmailVerificationExpiresAt(null);
        user.setEmailVerificationSentAt(null);
        user.prepareForSave();
        userRepository.save(user);

        return new SimpleMessageResponse(
                true,
                "Account created successfully. You can log in now.",
                user.getEmail(),
                false,
                false,
                requestedRole.name().toLowerCase()
        );
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        userRepository.findByEmail(email).or(() -> {
            pendingRegistrationRepository.findByEmail(email).ifPresent(registration -> {
                if (registration.getRole() == Role.FACULTY
                        && registration.isEmailVerified()
                        && passwordEncoder.matches(request.password(), registration.getPasswordHash())) {
                    if (registration.getApprovalStatus() == RegistrationApprovalStatus.PENDING) {
                        throw new ApiException(HttpStatus.FORBIDDEN, "Your faculty registration is waiting for admin approval.");
                    }
                    if (registration.getApprovalStatus() == RegistrationApprovalStatus.REJECTED) {
                        throw new ApiException(HttpStatus.FORBIDDEN, "Your faculty registration request was rejected. Please contact admin or register again.");
                    }
                }
            });
            return java.util.Optional.empty();
        });

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.password())
            );
        } catch (AuthenticationException ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
        }

        UserEntity user;
        try {
            user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password."));
        } catch (Exception ex) {
            user = userDocumentLookupService.findByEmail(email)
                    .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password."));
        }

        AppUserDetails userDetails = new AppUserDetails(user);
        String token = jwtService.generateToken(user.getId(), userDetails);
        return new AuthResponse(true, token, UserResponse.from(user));
    }

    public SimpleMessageResponse verifyEmail(VerifyOtpRequest request) {
        throw new ApiException(HttpStatus.GONE, "Email verification is currently disabled.");
    }

    public SimpleMessageResponse resendVerification(VerificationEmailRequest request) {
        throw new ApiException(HttpStatus.GONE, "Email verification is currently disabled.");
    }

    private SimpleMessageResponse verifyEmailLegacy(VerifyOtpRequest request) {
        String email = request.email().trim().toLowerCase();
        String normalizedOtp = request.otp().trim();
        if (!EmailAddressValidator.isRealistic(email)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid personal or school email address.");
        }

        PendingRegistrationEntity registration = pendingRegistrationRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "No pending registration found for this email."));

        if (registration.getOtpExpiresAt() == null || registration.getOtpExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP is invalid or expired. Please request a new OTP.");
        }
        if (!emailVerificationTokenService.hash(normalizedOtp).equals(registration.getOtpHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Incorrect OTP. Please try again.");
        }
        if (userRepository.existsByEmail(email)) {
            pendingRegistrationRepository.deleteByEmail(email);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already registered.");
        }

        registration.setEmailVerified(true);

        if (registration.getRole() == Role.FACULTY) {
            registration.setOtpHash(null);
            registration.setOtpExpiresAt(null);
            registration.setApprovalStatus(RegistrationApprovalStatus.PENDING);
            registration.prepareForSave();
            pendingRegistrationRepository.save(registration);

            notificationService.notifyRole(
                    Role.ADMIN,
                    "New faculty registration request",
                    registration.getName() + " is waiting for faculty account approval.",
                    "info",
                    null
            );

            return new SimpleMessageResponse(
                    true,
                    "Email verified successfully. Your faculty request has been sent to admin for approval.",
                    registration.getEmail(),
                    false,
                    true,
                    registration.getRole().name().toLowerCase()
            );
        }

        UserEntity user = new UserEntity();
        user.setName(registration.getName());
        user.setEmail(email);
        user.setPassword(registration.getPasswordHash());
        user.setRole(registration.getRole() == null ? Role.STUDENT : registration.getRole());
        user.setGrade(registration.getGrade());
        user.setEmailVerified(true);
        user.setEmailVerificationTokenHash(null);
        user.setEmailVerificationExpiresAt(null);
        user.setEmailVerificationSentAt(registration.getOtpSentAt());
        user.prepareForSave();
        userRepository.save(user);
        pendingRegistrationRepository.deleteByEmail(email);

        return new SimpleMessageResponse(
                true,
                "Email verified successfully. Your account has been created.",
                user.getEmail(),
                false,
                false,
                user.getRole().name().toLowerCase()
        );
    }

    private SimpleMessageResponse resendVerificationLegacy(VerificationEmailRequest request) {
        String email = request.email().trim().toLowerCase();
        validateEmail(email);
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This email is already registered.");
        }

        PendingRegistrationEntity registration = pendingRegistrationRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "No pending registration found for this email."));

        EmailVerificationTokenService.VerificationToken verificationToken = emailVerificationTokenService.createToken();
        registration.setOtpHash(verificationToken.tokenHash());
        registration.setOtpExpiresAt(verificationToken.expiresAt());
        registration.setOtpSentAt(Instant.now());
        registration.prepareForSave();
        pendingRegistrationRepository.save(registration);
        emailDeliveryService.sendVerificationEmail(registration, verificationToken.rawToken());

        return new SimpleMessageResponse(
                true,
                "OTP sent again. Please check your email.",
                registration.getEmail(),
                true,
                false,
                registration.getRole().name().toLowerCase()
        );
    }

    private Role resolveRequestedRole(String value) {
        Role role = Role.fromValue(value);
        if (role == Role.ADMIN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Admin accounts cannot be self-registered.");
        }
        return role;
    }

    private void validateEmail(String email) {
        if (!EmailAddressValidator.isRealistic(email)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid personal or school email address.");
        }
    }
}
