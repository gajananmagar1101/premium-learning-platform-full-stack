package com.studentplatform.backend.service;

import com.studentplatform.backend.dto.GradeSubmissionRequest;
import com.studentplatform.backend.dto.StudentPerformanceResponse;
import com.studentplatform.backend.dto.SubmissionRequest;
import com.studentplatform.backend.dto.SubmissionResponse;
import com.studentplatform.backend.dto.SubmissionSummaryResponse;
import com.studentplatform.backend.entity.AssignmentEntity;
import com.studentplatform.backend.entity.Role;
import com.studentplatform.backend.entity.SubmissionEntity;
import com.studentplatform.backend.entity.SubmissionStatus;
import com.studentplatform.backend.entity.UserEntity;
import com.studentplatform.backend.exception.ApiException;
import com.studentplatform.backend.repository.SubmissionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final AssignmentManagementService assignmentManagementService;
    private final NotificationService notificationService;

    public SubmissionService(
            SubmissionRepository submissionRepository,
            AssignmentManagementService assignmentManagementService,
            NotificationService notificationService
    ) {
        this.submissionRepository = submissionRepository;
        this.assignmentManagementService = assignmentManagementService;
        this.notificationService = notificationService;
    }

    public SubmissionSummaryResponse create(UserEntity student, SubmissionRequest request) {
        AssignmentEntity assignment = assignmentManagementService.getEntity(request.assignmentId());
        ensureBeforeDeadline(assignment);
        validatePayload(request);

        submissionRepository.findByStudent_IdAndAssignment_Id(student.getId(), assignment.getId())
                .ifPresent(existing -> {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "You have already submitted this assignment.");
                });

        SubmissionEntity submission = new SubmissionEntity();
        submission.setStudent(student);
        submission.setAssignment(assignment);
        applySubmissionContent(submission, request);
        submission.setStatus(SubmissionStatus.SUBMITTED);
        submission.setMarks(null);
        submission.prepareForSave();
        SubmissionEntity saved = submissionRepository.save(submission);

        notificationService.notifyRole(
                Role.ADMIN,
                "New assignment submission",
                student.getName() + " submitted " + assignment.getTitle() + ".",
                "info",
                student.getId()
        );

        return SubmissionSummaryResponse.from(saved);
    }

    public SubmissionSummaryResponse update(String id, UserEntity student, SubmissionRequest request) {
        SubmissionEntity submission = getEntity(id);
        if (!submission.getStudent().getId().equals(student.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can edit only your own submission.");
        }
        if (!submission.getAssignment().getId().equals(request.assignmentId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Submission does not belong to this assignment.");
        }

        ensureBeforeDeadline(submission.getAssignment());
        validatePayload(request);
        applySubmissionContent(submission, request);
        submission.setStatus(submission.getMarks() == null ? SubmissionStatus.SUBMITTED : SubmissionStatus.GRADED);
        submission.prepareForSave();
        SubmissionEntity saved = submissionRepository.save(submission);

        notificationService.notifyRole(
                Role.ADMIN,
                "Submission updated",
                student.getName() + " updated submission for " + submission.getAssignment().getTitle() + ".",
                "info",
                student.getId()
        );

        return SubmissionSummaryResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> getAllForAdmin() {
        return submissionRepository.findAllByOrderByUpdatedAtDesc().stream()
                .map(SubmissionResponse::from)
                .toList();
    }

    public SubmissionResponse grade(String id, GradeSubmissionRequest request) {
        SubmissionEntity submission = getEntity(id);
        if (request.marks() > submission.getAssignment().getTotalMarks()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Marks cannot exceed total marks of " + submission.getAssignment().getTotalMarks() + "."
            );
        }
        submission.setMarks(request.marks());
        submission.setStatus(SubmissionStatus.GRADED);
        submission.prepareForSave();
        SubmissionEntity saved = submissionRepository.save(submission);

        notificationService.notifyUsersByIds(
                List.of(saved.getStudent().getId()),
                "Marks published",
                "Your marks for " + saved.getAssignment().getTitle() + " are now available.",
                "success",
                null
        );

        return SubmissionResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public StudentPerformanceResponse getStudentPerformance(String studentId, UserEntity currentUser) {
        if (!currentUser.getRole().name().equals("ADMIN") && !currentUser.getId().equals(studentId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Not allowed to view this student's performance.");
        }

        List<SubmissionEntity> submissions = submissionRepository.findByStudent_IdOrderByUpdatedAtDesc(studentId);
        List<SubmissionEntity> gradedSubmissions = submissions.stream()
                .filter(submission -> submission.getMarks() != null)
                .toList();
        int totalSubmissions = gradedSubmissions.size();

        List<Integer> gradedMarks = gradedSubmissions.stream()
                .map(SubmissionEntity::getMarks)
                .toList();

        double avgScore = gradedMarks.isEmpty()
                ? 0
                : gradedMarks.stream().mapToInt(Integer::intValue).average().orElse(0);

        int bestScore = gradedMarks.isEmpty()
                ? 0
                : gradedMarks.stream().mapToInt(Integer::intValue).max().orElse(0);

        List<Integer> gradedPercentages = gradedSubmissions.stream()
                .map(submission -> (int) Math.round((submission.getMarks() * 100.0) / submission.getAssignment().getTotalMarks()))
                .toList();

        double avgPercentage = gradedPercentages.isEmpty()
                ? 0
                : gradedPercentages.stream().mapToInt(Integer::intValue).average().orElse(0);

        int bestPercentage = gradedPercentages.isEmpty()
                ? 0
                : gradedPercentages.stream().mapToInt(Integer::intValue).max().orElse(0);

        int progressPercent = (int) Math.round(avgPercentage);
        String overallGrade = toLetterGrade(avgPercentage);

        List<StudentPerformanceResponse.ScoreHistoryItem> scoreHistory = gradedSubmissions.stream()
                .map(submission -> new StudentPerformanceResponse.ScoreHistoryItem(
                        submission.getId(),
                        submission.getAssignment().getId(),
                        submission.getAssignment().getTitle(),
                        submission.getAssignment().getSubject(),
                        submission.getMarks(),
                        submission.getAssignment().getTotalMarks(),
                        (int) Math.round((submission.getMarks() * 100.0) / submission.getAssignment().getTotalMarks()),
                        submission.getUpdatedAt().toString()
                ))
                .toList();

        return new StudentPerformanceResponse(
                Math.round(avgScore * 100.0) / 100.0,
                Math.round(avgPercentage * 100.0) / 100.0,
                bestScore,
                bestPercentage,
                overallGrade,
                progressPercent,
                totalSubmissions,
                scoreHistory
        );
    }

    private String toLetterGrade(double percentage) {
        if (percentage >= 90) return "A";
        if (percentage >= 80) return "B";
        if (percentage >= 70) return "C";
        if (percentage >= 60) return "D";
        return "F";
    }

    @Transactional(readOnly = true)
    public SubmissionEntity getEntity(String id) {
        return submissionRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Submission not found."));
    }

    private void validatePayload(SubmissionRequest request) {
        String content = request.content() == null ? "" : request.content().trim();
        String fileName = request.fileName() == null ? "" : request.fileName().trim();
        String fileContent = request.fileContent() == null ? "" : request.fileContent().trim();
        if (content.isBlank() && (fileName.isBlank() || fileContent.isBlank())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please provide text content or upload a file.");
        }
    }

    private void applySubmissionContent(SubmissionEntity submission, SubmissionRequest request) {
        String content = request.content() == null ? "" : request.content().trim();
        String fileName = request.fileName() == null ? "" : request.fileName().trim();
        String fileContent = request.fileContent() == null ? "" : request.fileContent().trim();
        submission.setContent(content.isBlank() ? null : content);
        submission.setFileName(fileName.isBlank() ? null : fileName);
        submission.setFileContent(fileContent.isBlank() ? null : fileContent);
    }

    private void ensureBeforeDeadline(AssignmentEntity assignment) {
        if (assignment.getDeadline().isBefore(LocalDateTime.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Submission deadline has passed.");
        }
    }
}
