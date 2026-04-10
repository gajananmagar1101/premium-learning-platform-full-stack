package com.studentplatform.backend.dto;

public record StudentPerformanceResponse(
        double avgScore,
        double avgPercentage,
        int bestScore,
        int bestPercentage,
        String overallGrade,
        int progressPercent,
        int totalSubmissions,
        java.util.List<ScoreHistoryItem> scoreHistory
) {
    public record ScoreHistoryItem(
            String submissionId,
            String assignmentId,
            String assignmentTitle,
            String subject,
            int marks,
            int totalMarks,
            int percentage,
            String gradedAt
    ) {}
}
