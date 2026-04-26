package com.studentplatform.backend.controller;

import com.studentplatform.backend.dto.QuizAttemptRequest;
import com.studentplatform.backend.dto.QuizRequest;
import com.studentplatform.backend.dto.QuizSessionRequest;
import com.studentplatform.backend.security.AppUserDetails;
import com.studentplatform.backend.service.QuizService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/quizzes")
public class QuizController {

    private final QuizService quizService;

    public QuizController(QuizService quizService) {
        this.quizService = quizService;
    }

    @GetMapping
    public Map<String, Object> getAll(@AuthenticationPrincipal AppUserDetails userDetails) {
        return Map.of("success", true, "quizzes", quizService.getAll(userDetails.getUser()));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> create(@Valid @RequestBody QuizRequest request) {
        return Map.of("success", true, "quiz", quizService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> update(@PathVariable String id, @Valid @RequestBody QuizRequest request) {
        return Map.of("success", true, "quiz", quizService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> delete(@PathVariable String id) {
        quizService.delete(id);
        return Map.of("success", true, "message", "Quiz deleted.");
    }

    @GetMapping("/attempts")
    public Map<String, Object> getAttempts(@AuthenticationPrincipal AppUserDetails userDetails) {
        return Map.of("success", true, "attempts", quizService.getAttempts(userDetails.getUser()));
    }

    @PostMapping("/{id}/attempt")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> submitAttempt(
            @PathVariable String id,
            @Valid @RequestBody QuizAttemptRequest request,
            @AuthenticationPrincipal AppUserDetails userDetails
    ) {
        return Map.of("success", true, "attempt", quizService.submitAttempt(id, request, userDetails.getUser()));
    }

    @PostMapping("/{id}/session")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> startSession(
            @PathVariable String id,
            @AuthenticationPrincipal AppUserDetails userDetails
    ) {
        return Map.of("success", true, "session", quizService.startSession(id, userDetails.getUser()));
    }

    @PutMapping("/{id}/session")
    public Map<String, Object> updateSession(
            @PathVariable String id,
            @RequestBody QuizSessionRequest request,
            @AuthenticationPrincipal AppUserDetails userDetails
    ) {
        return Map.of("success", true, "session", quizService.updateSession(id, request, userDetails.getUser()));
    }
}
