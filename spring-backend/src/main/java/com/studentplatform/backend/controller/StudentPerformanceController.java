package com.studentplatform.backend.controller;

import com.studentplatform.backend.security.AppUserDetails;
import com.studentplatform.backend.service.SubmissionService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/student/performance")
public class StudentPerformanceController {

    private final SubmissionService submissionService;

    public StudentPerformanceController(SubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @GetMapping("/{studentId}")
    public Map<String, Object> getStudentPerformance(
            @PathVariable String studentId,
            @AuthenticationPrincipal AppUserDetails userDetails
    ) {
        return Map.of(
                "success", true,
                "performance", submissionService.getStudentPerformance(studentId, userDetails.getUser())
        );
    }
}
