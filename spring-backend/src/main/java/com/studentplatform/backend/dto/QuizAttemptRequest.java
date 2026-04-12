package com.studentplatform.backend.dto;

import java.util.List;

public record QuizAttemptRequest(
        List<Integer> answers
) {}
