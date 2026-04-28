package com.studentplatform.backend.dto;

import java.util.List;

public record AiQuizQuestionResponse(
        Integer id,
        String question,
        List<String> options,
        String correctAnswer
) {
}
