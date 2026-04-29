package com.studentplatform.backend.service;

import com.studentplatform.backend.dto.AssignmentRequest;
import com.studentplatform.backend.dto.AssignmentResponse;
import com.studentplatform.backend.dto.StudentAssignmentResponse;
import com.studentplatform.backend.entity.AssignmentEntity;
import com.studentplatform.backend.entity.AssignmentStatus;
import com.studentplatform.backend.entity.SubjectEntity;
import com.studentplatform.backend.entity.SubmissionEntity;
import com.studentplatform.backend.entity.UserEntity;
import com.studentplatform.backend.exception.ApiException;
import com.studentplatform.backend.repository.AssignmentRepository;
import com.studentplatform.backend.repository.SubmissionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
public class AssignmentManagementService {

    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final NotificationService notificationService;
    private final SubjectService subjectService;

    public AssignmentManagementService(
            AssignmentRepository assignmentRepository,
            SubmissionRepository submissionRepository,
            NotificationService notificationService,
            SubjectService subjectService
    ) {
        this.assignmentRepository = assignmentRepository;
        this.submissionRepository = submissionRepository;
        this.notificationService = notificationService;
        this.subjectService = subjectService;
    }

    @Transactional(readOnly = true)
    public List<AssignmentResponse> getAllForAdmin() {
        return assignmentRepository.findAllByOrderByDeadlineAscCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StudentAssignmentResponse> getAllForStudent(UserEntity student) {
        String studentClass = normalizeClassName(student.getGrade());
        Map<String, SubmissionEntity> submissionsByAssignment = submissionRepository
                .findByStudent_IdOrderByUpdatedAtDesc(student.getId())
                .stream()
                .collect(Collectors.toMap(
                        submission -> submission.getAssignment().getId(),
                        Function.identity(),
                        (left, _right) -> left
                ));

        return assignmentRepository.findAllByOrderByDeadlineAscCreatedAtDesc().stream()
                .filter(assignment -> {
                    String assignmentClass = normalizeClassName(assignment.getClassName());
                    return !assignmentClass.isBlank()
                            && !studentClass.isBlank()
                            && assignmentClass.equals(studentClass)
                            && assignment.getStatus() == AssignmentStatus.PUBLISHED;
                })
                .map(assignment -> StudentAssignmentResponse.from(
                        assignment,
                        submissionsByAssignment.get(assignment.getId()),
                        resolveSubjectName(assignment)
                ))
                .toList();
    }

    public AssignmentResponse create(AssignmentRequest request, UserEntity createdBy) {
        AssignmentEntity assignment = new AssignmentEntity();
        apply(assignment, request);
        assignment.setCreatedBy(createdBy);
        assignment.prepareForSave();
        AssignmentEntity saved = assignmentRepository.save(assignment);

        if (saved.getStatus() == AssignmentStatus.PUBLISHED) {
            notificationService.notifyStudentsByGrade(
                    saved.getClassName(),
                    "New assignment",
                    saved.getTitle() + " has been posted for your cohort.",
                    "info",
                    createdBy.getId()
            );
        }

        return toResponse(saved);
    }

    public AssignmentResponse update(String id, AssignmentRequest request) {
        AssignmentEntity assignment = getEntity(id);
        AssignmentStatus previousStatus = assignment.getStatus();
        apply(assignment, request);
        assignment.prepareForSave();
        AssignmentEntity saved = assignmentRepository.save(assignment);

        if (saved.getStatus() == AssignmentStatus.PUBLISHED) {
            notificationService.notifyStudentsByGrade(
                    saved.getClassName(),
                    previousStatus == AssignmentStatus.DRAFT ? "New assignment" : "Assignment updated",
                    previousStatus == AssignmentStatus.DRAFT
                            ? saved.getTitle() + " has been posted for your cohort."
                            : saved.getTitle() + " has been updated.",
                    "info",
                    null
            );
        }

        return toResponse(saved);
    }

    public AssignmentResponse publish(String id) {
        AssignmentEntity assignment = getEntity(id);
        assignment.setStatus(AssignmentStatus.PUBLISHED);
        assignment.prepareForSave();
        AssignmentEntity saved = assignmentRepository.save(assignment);

        notificationService.notifyStudentsByGrade(
                saved.getClassName(),
                "New assignment",
                saved.getTitle() + " has been posted for your cohort.",
                "info",
                null
        );

        return toResponse(saved);
    }

    public void delete(String id) {
        AssignmentEntity assignment = getEntity(id);
        submissionRepository.deleteByAssignment_Id(assignment.getId());
        assignmentRepository.delete(assignment);
    }

    @Transactional(readOnly = true)
    public AssignmentEntity getEntity(String id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Assignment not found."));
    }

    private void apply(AssignmentEntity assignment, AssignmentRequest request) {
        SubjectEntity subject = subjectService.resolveSubject(request.subjectId(), request.subject());
        subjectService.validateSubjectYear(subject, request.className());
        assignment.setTitle(request.title().trim());
        assignment.setSubjectId(subject.getId());
        assignment.setLegacySubject(subject.getName());
        assignment.setClassName(subject.getYearId());
        assignment.setDescription(request.description().trim());
        assignment.setTotalMarks(request.totalMarks());
        assignment.setDeadline(request.deadline());
        assignment.setStatus(request.status() == null ? AssignmentStatus.DRAFT : request.status());
        assignment.setQuestionFileName(request.questionFileName());
        assignment.setQuestionFileContent(request.questionFileContent());
    }

    public String resolveSubjectName(AssignmentEntity assignment) {
        if (assignment.getSubjectId() != null && !assignment.getSubjectId().isBlank()) {
            SubjectEntity subject = subjectService.resolveSubject(assignment.getSubjectId(), null);
            return subjectService.resolveSubjectName(subject, assignment.getLegacySubject());
        }
        return subjectService.resolveSubjectName(null, assignment.getLegacySubject());
    }

    private AssignmentResponse toResponse(AssignmentEntity assignment) {
        return AssignmentResponse.from(assignment, resolveSubjectName(assignment));
    }

    private String normalizeClassName(String value) {
        if (value == null) {
            return "";
        }

        return value
                .trim()
                .toLowerCase()
                .replace("class", "")
                .replace("grade", "")
                .replaceAll("\\s+", "")
                .replaceAll("(st|nd|rd|th)$", "");
    }
}
