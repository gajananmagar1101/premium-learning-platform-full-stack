package com.studentplatform.backend.service;

import com.studentplatform.backend.dto.AssignmentRequest;
import com.studentplatform.backend.dto.AssignmentResponse;
import com.studentplatform.backend.dto.StudentAssignmentResponse;
import com.studentplatform.backend.entity.AssignmentEntity;
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

    public AssignmentManagementService(
            AssignmentRepository assignmentRepository,
            SubmissionRepository submissionRepository
    ) {
        this.assignmentRepository = assignmentRepository;
        this.submissionRepository = submissionRepository;
    }

    @Transactional(readOnly = true)
    public List<AssignmentResponse> getAllForAdmin() {
        return assignmentRepository.findAllByOrderByDeadlineAscCreatedAtDesc().stream()
                .map(AssignmentResponse::from)
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
                    return !assignmentClass.isBlank() && !studentClass.isBlank() && assignmentClass.equals(studentClass);
                })
                .map(assignment -> StudentAssignmentResponse.from(
                        assignment,
                        submissionsByAssignment.get(assignment.getId())
                ))
                .toList();
    }

    public AssignmentResponse create(AssignmentRequest request, UserEntity createdBy) {
        AssignmentEntity assignment = new AssignmentEntity();
        apply(assignment, request);
        assignment.setCreatedBy(createdBy);
        assignment.prepareForSave();
        return AssignmentResponse.from(assignmentRepository.save(assignment));
    }

    public AssignmentResponse update(String id, AssignmentRequest request) {
        AssignmentEntity assignment = getEntity(id);
        apply(assignment, request);
        assignment.prepareForSave();
        return AssignmentResponse.from(assignmentRepository.save(assignment));
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
        assignment.setTitle(request.title().trim());
        assignment.setSubject(request.subject().trim());
        assignment.setClassName(request.className().trim());
        assignment.setDescription(request.description().trim());
        assignment.setTotalMarks(request.totalMarks());
        assignment.setDeadline(request.deadline());
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
