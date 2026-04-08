package com.studentplatform.backend.controller;

import com.studentplatform.backend.dto.AuthResponse;
import com.studentplatform.backend.dto.LoginRequest;
import com.studentplatform.backend.dto.RegisterRequest;
import com.studentplatform.backend.dto.UserResponse;
import com.studentplatform.backend.security.AppUserDetails;
import com.studentplatform.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal AppUserDetails userDetails) {
        return Map.of("success", true, "user", UserResponse.from(userDetails.getUser()));
    }
}
