package com.studentplatform.backend.controller;

import com.studentplatform.backend.dto.AiQuizGenerateRequest;
import com.studentplatform.backend.dto.AiQuizQuestionResponse;
import com.studentplatform.backend.dto.AiQuizStatusResponse;
import com.studentplatform.backend.service.AiQuizService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/ai")
public class AiQuizController {

    private final AiQuizService aiQuizService;

    public AiQuizController(AiQuizService aiQuizService) {
        this.aiQuizService = aiQuizService;
    }

    @GetMapping("/status")
    @PreAuthorize("hasRole('ADMIN')")
    public AiQuizStatusResponse status() {
        return aiQuizService.getStatus();
    }

    @PostMapping("/generate-quiz")
    @PreAuthorize("hasRole('ADMIN')")
    public List<AiQuizQuestionResponse> generateQuiz(@Valid @RequestBody AiQuizGenerateRequest request) {
        return aiQuizService.generateQuiz(request);
    }
}
