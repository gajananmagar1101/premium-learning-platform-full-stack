package com.studentplatform.backend.service;

import com.studentplatform.backend.dto.AnalyticsResponse;
import com.studentplatform.backend.dto.ScoreAssignmentRequest;
import com.studentplatform.backend.dto.ScoreResponse;
import com.studentplatform.backend.entity.AssessmentEntity;
import com.studentplatform.backend.entity.Role;
import com.studentplatform.backend.entity.ScoreEntity;
import com.studentplatform.backend.entity.UserEntity;
import com.studentplatform.backend.exception.ApiException;
import com.studentplatform.backend.repository.AssessmentRepository;
import com.studentplatform.backend.repository.ScoreRepository;
import com.studentplatform.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class ScoreService {

    private final ScoreRepository scoreRepository;
    private final UserRepository userRepository;
    private final AssessmentRepository assessmentRepository;

    public ScoreService(
            ScoreRepository scoreRepository,
            UserRepository userRepository,
            AssessmentRepository assessmentRepository
    ) {
        this.scoreRepository = scoreRepository;
        this.userRepository = userRepository;
        this.assessmentRepository = assessmentRepository;
    }

    public ScoreResponse assign(ScoreAssignmentRequest request) {
        String studentId = request.studentId();
        String assessmentId = request.assessmentId();

        UserEntity student = userRepository.findById(studentId)
                .filter(user -> user.getRole() == Role.STUDENT)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Student not found."));

        AssessmentEntity assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Assessment not found."));

        if (request.score() > assessment.getMaxScore()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Score cannot exceed max score of " + assessment.getMaxScore() + ".");
        }

        ScoreEntity score = scoreRepository.findByStudent_IdAndAssessment_Id(studentId, assessmentId)
                .orElseGet(ScoreEntity::new);
        score.setStudent(student);
        score.setAssessment(assessment);
        score.setScore(request.score());
        score.setFeedback(request.feedback() == null ? "" : request.feedback().trim());
        score.prepareForSave();

        return ScoreResponse.from(scoreRepository.save(score));
    }

    @Transactional(readOnly = true)
    public List<ScoreResponse> getAll() {
        return scoreRepository.findAllByOrderBySubmittedAtDesc().stream()
                .map(ScoreResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ScoreResponse> getStudentScores(String studentId, UserEntity currentUser) {
        if (currentUser.getRole() == Role.STUDENT && !currentUser.getId().equals(studentId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Not allowed to view this student's scores.");
        }

        return scoreRepository.findByStudent_IdOrderBySubmittedAtDesc(studentId).stream()
                .map(ScoreResponse::from)
                .toList();
    }

    public void delete(String id) {
        if (!scoreRepository.existsById(id)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Score not found.");
        }
        scoreRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public AnalyticsResponse getAnalytics() {
        long totalStudents = userRepository.countByRole(Role.STUDENT);
        long totalAssessments = assessmentRepository.count();
        List<ScoreEntity> scores = scoreRepository.findAll();

        int avgScore = scores.isEmpty() ? 0 : (int) Math.round(
                scores.stream()
                        .mapToDouble(score -> percentage(score))
                        .average()
                        .orElse(0)
        );

        Map<String, SubjectAccumulator> bySubject = new LinkedHashMap<>();
        Map<String, StudentAccumulator> byStudent = new LinkedHashMap<>();

        for (ScoreEntity score : scores) {
            double pct = percentage(score);
            bySubject.computeIfAbsent(score.getAssessment().getSubject(), ignored -> new SubjectAccumulator())
                    .accept(pct);
            byStudent.computeIfAbsent(score.getStudent().getId(), ignored -> new StudentAccumulator(score.getStudent()))
                    .accept(pct);
        }

        List<AnalyticsResponse.SubjectAverage> subjectAverages = bySubject.entrySet().stream()
                .map(entry -> new AnalyticsResponse.SubjectAverage(
                        entry.getKey(),
                        (int) Math.round(entry.getValue().average()),
                        (int) Math.round(entry.getValue().max)
                ))
                .toList();

        List<AnalyticsResponse.LeaderboardEntry> leaderboard = byStudent.values().stream()
                .map(acc -> new AnalyticsResponse.LeaderboardEntry(
                        acc.student.getId(),
                        acc.student.getName(),
                        acc.student.getGrade(),
                        (int) Math.round(acc.average())
                ))
                .sorted(Comparator.comparingInt(AnalyticsResponse.LeaderboardEntry::avg).reversed())
                .limit(5)
                .toList();

        return new AnalyticsResponse(totalStudents, totalAssessments, avgScore, subjectAverages, leaderboard);
    }

    private double percentage(ScoreEntity score) {
        return (score.getScore() * 100.0) / score.getAssessment().getMaxScore();
    }

    private static class SubjectAccumulator {
        private double total;
        private int count;
        private double max;

        void accept(double pct) {
            total += pct;
            count++;
            max = Math.max(max, pct);
        }

        double average() {
            return count == 0 ? 0 : total / count;
        }
    }

    private static class StudentAccumulator {
        private final UserEntity student;
        private final List<Double> percentages = new ArrayList<>();

        private StudentAccumulator(UserEntity student) {
            this.student = student;
        }

        void accept(double pct) {
            percentages.add(pct);
        }

        double average() {
            return percentages.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        }
    }
}
