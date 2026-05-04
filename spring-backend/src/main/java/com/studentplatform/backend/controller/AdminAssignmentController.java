package com.studentplatform.backend.controller;

import com.studentplatform.backend.dto.AssignmentRequest;
import com.studentplatform.backend.security.AppUserDetails;
import com.studentplatform.backend.service.AssignmentManagementService;
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
@RequestMapping("/api/admin/assignments")
@PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
public class AdminAssignmentController {

    private final AssignmentManagementService assignmentManagementService;

    public AdminAssignmentController(AssignmentManagementService assignmentManagementService) {
        this.assignmentManagementService = assignmentManagementService;
    }

    @GetMapping
    public Map<String, Object> getAll() {
        return Map.of("success", true, "assignments", assignmentManagementService.getAllForAdmin());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> create(
            @Valid @RequestBody AssignmentRequest request,
            @AuthenticationPrincipal AppUserDetails userDetails
    ) {
        return Map.of("success", true, "assignment", assignmentManagementService.create(request, userDetails.getUser()));
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable String id, @Valid @RequestBody AssignmentRequest request) {
        return Map.of("success", true, "assignment", assignmentManagementService.update(id, request));
    }

    @PostMapping("/{id}/publish")
    public Map<String, Object> publish(@PathVariable String id) {
        return Map.of("success", true, "assignment", assignmentManagementService.publish(id));
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable String id) {
        assignmentManagementService.delete(id);
        return Map.of("success", true, "message", "Assignment deleted.");
    }
}
