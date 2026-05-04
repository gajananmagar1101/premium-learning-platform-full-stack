package com.studentplatform.backend.controller;

import com.studentplatform.backend.dto.CreateSubjectRequest;
import com.studentplatform.backend.service.SubjectService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/subjects")
public class SubjectController {

    private final SubjectService subjectService;

    public SubjectController(SubjectService subjectService) {
        this.subjectService = subjectService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public Map<String, Object> getAll() {
        return Map.of(
                "success", true,
                "subjects", subjectService.getAll()
        );
    }

    @GetMapping("/{yearId}")
    public Map<String, Object> getByYear(@PathVariable String yearId) {
        return Map.of(
                "success", true,
                "subjects", subjectService.getByYear(yearId)
        );
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> create(@Valid @RequestBody CreateSubjectRequest request) {
        return Map.of(
                "success", true,
                "subject", subjectService.create(request)
        );
    }

    @DeleteMapping("/{subjectId}")
    @PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
    public Map<String, Object> delete(@PathVariable String subjectId) {
        subjectService.delete(subjectId);
        return Map.of(
                "success", true,
                "message", "Subject removed successfully."
        );
    }
}
