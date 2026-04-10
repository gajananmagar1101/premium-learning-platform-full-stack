package com.studentplatform.backend.controller;

import com.studentplatform.backend.dto.SubmissionRequest;
import com.studentplatform.backend.security.AppUserDetails;
import com.studentplatform.backend.service.SubmissionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/student/submissions")
@PreAuthorize("hasRole('STUDENT')")
public class StudentSubmissionController {

    private final SubmissionService submissionService;

    public StudentSubmissionController(SubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> create(
            @Valid @RequestBody SubmissionRequest request,
            @AuthenticationPrincipal AppUserDetails userDetails
    ) {
        return Map.of("success", true, "submission", submissionService.create(userDetails.getUser(), request));
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(
            @PathVariable String id,
            @Valid @RequestBody SubmissionRequest request,
            @AuthenticationPrincipal AppUserDetails userDetails
    ) {
        return Map.of("success", true, "submission", submissionService.update(id, userDetails.getUser(), request));
    }
}
