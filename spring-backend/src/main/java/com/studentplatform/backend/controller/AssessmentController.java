package com.studentplatform.backend.controller;

import com.studentplatform.backend.dto.AssessmentRequest;
import com.studentplatform.backend.security.AppUserDetails;
import com.studentplatform.backend.service.AssessmentService;
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
@RequestMapping("/api/assessments")
public class AssessmentController {

    private final AssessmentService assessmentService;

    public AssessmentController(AssessmentService assessmentService) {
        this.assessmentService = assessmentService;
    }

    @GetMapping
    public Map<String, Object> getAll() {
        return Map.of("success", true, "assessments", assessmentService.getAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> create(
            @Valid @RequestBody AssessmentRequest request,
            @AuthenticationPrincipal AppUserDetails userDetails
    ) {
        return Map.of("success", true, "assessment", assessmentService.create(request, userDetails.getUser()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public Map<String, Object> update(@PathVariable String id, @Valid @RequestBody AssessmentRequest request) {
        return Map.of("success", true, "assessment", assessmentService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public Map<String, Object> delete(@PathVariable String id) {
        assessmentService.delete(id);
        return Map.of("success", true, "message", "Assessment deleted.");
    }
}
