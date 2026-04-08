package com.studentplatform.backend.controller;

import com.studentplatform.backend.dto.ScoreAssignmentRequest;
import com.studentplatform.backend.security.AppUserDetails;
import com.studentplatform.backend.service.ScoreService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/scores")
public class ScoreController {

    private final ScoreService scoreService;

    public ScoreController(ScoreService scoreService) {
        this.scoreService = scoreService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> getAll() {
        return Map.of("success", true, "scores", scoreService.getAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> assign(@Valid @RequestBody ScoreAssignmentRequest request) {
        return Map.of("success", true, "score", scoreService.assign(request));
    }

    @GetMapping("/analytics")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> analytics() {
        return Map.of("success", true, "analytics", scoreService.getAnalytics());
    }

    @GetMapping("/student/{id}")
    public Map<String, Object> getStudentScores(
            @PathVariable String id,
            @AuthenticationPrincipal AppUserDetails userDetails
    ) {
        return Map.of("success", true, "scores", scoreService.getStudentScores(id, userDetails.getUser()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> delete(@PathVariable String id) {
        scoreService.delete(id);
        return Map.of("success", true, "message", "Score deleted.");
    }
}
