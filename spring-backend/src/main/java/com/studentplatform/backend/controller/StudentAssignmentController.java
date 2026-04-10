package com.studentplatform.backend.controller;

import com.studentplatform.backend.security.AppUserDetails;
import com.studentplatform.backend.service.AssignmentManagementService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/student/assignments")
@PreAuthorize("hasRole('STUDENT')")
public class StudentAssignmentController {

    private final AssignmentManagementService assignmentManagementService;

    public StudentAssignmentController(AssignmentManagementService assignmentManagementService) {
        this.assignmentManagementService = assignmentManagementService;
    }

    @GetMapping
    public Map<String, Object> getAll(@AuthenticationPrincipal AppUserDetails userDetails) {
        return Map.of("success", true, "assignments", assignmentManagementService.getAllForStudent(userDetails.getUser()));
    }
}
