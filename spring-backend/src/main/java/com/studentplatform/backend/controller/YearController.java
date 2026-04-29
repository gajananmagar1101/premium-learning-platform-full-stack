package com.studentplatform.backend.controller;

import com.studentplatform.backend.service.SubjectService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/years")
public class YearController {

    private final SubjectService subjectService;

    public YearController(SubjectService subjectService) {
        this.subjectService = subjectService;
    }

    @GetMapping
    public Map<String, Object> getAll() {
        return Map.of("success", true, "years", subjectService.getYears());
    }
}
