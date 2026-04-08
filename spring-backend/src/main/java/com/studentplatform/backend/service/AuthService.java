package com.studentplatform.backend.service;

import com.studentplatform.backend.dto.AuthResponse;
import com.studentplatform.backend.dto.LoginRequest;
import com.studentplatform.backend.dto.RegisterRequest;
import com.studentplatform.backend.dto.UserResponse;
import com.studentplatform.backend.entity.Role;
import com.studentplatform.backend.entity.UserEntity;
import com.studentplatform.backend.exception.ApiException;
import com.studentplatform.backend.repository.UserRepository;
import com.studentplatform.backend.security.AppUserDetails;
import com.studentplatform.backend.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already registered.");
        }

        UserEntity user = new UserEntity();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole("admin".equalsIgnoreCase(request.role()) ? Role.ADMIN : Role.STUDENT);
        user.setGrade(request.grade() == null ? "" : request.grade().trim());

        UserEntity saved = userRepository.save(user);
        AppUserDetails userDetails = new AppUserDetails(saved);
        String token = jwtService.generateToken(saved.getId(), userDetails);
        return new AuthResponse(true, token, UserResponse.from(saved));
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email().trim().toLowerCase(), request.password())
            );
        } catch (AuthenticationException ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
        }

        UserEntity user = userRepository.findByEmail(request.email().trim().toLowerCase())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password."));

        AppUserDetails userDetails = new AppUserDetails(user);
        String token = jwtService.generateToken(user.getId(), userDetails);
        return new AuthResponse(true, token, UserResponse.from(user));
    }
}
