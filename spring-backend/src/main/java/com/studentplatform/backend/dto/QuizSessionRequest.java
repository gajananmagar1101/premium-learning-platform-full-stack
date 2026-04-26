package com.studentplatform.backend.dto;

import java.util.List;

public record QuizSessionRequest(
        List<Integer> answers,
        Integer currentQuestionIndex
) {}
