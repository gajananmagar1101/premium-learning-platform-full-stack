package com.studentplatform.backend.controller;

import com.studentplatform.backend.dto.GradeSubmissionRequest;
import com.studentplatform.backend.service.SubmissionService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/submissions")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSubmissionController {

    private final SubmissionService submissionService;

    public AdminSubmissionController(SubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @GetMapping
    public Map<String, Object> getAll() {
        return Map.of("success", true, "submissions", submissionService.getAllForAdmin());
    }

    @PutMapping("/{id}/marks")
    public Map<String, Object> grade(@PathVariable String id, @Valid @RequestBody GradeSubmissionRequest request) {
        return Map.of("success", true, "submission", submissionService.grade(id, request));
    }
}
