package com.studentplatform.backend.dto;

import java.util.List;

public record AnalyticsResponse(
        long totalStudents,
        long totalAssessments,
        int avgScore,
        List<SubjectAverage> subjectAverages,
        List<LeaderboardEntry> leaderboard
) {
    public record SubjectAverage(String subject, int classAvg, int topScore) {}
    public record LeaderboardEntry(String id, String name, String grade, int avg) {}
}
