package com.studentplatform.backend.service;

import com.studentplatform.backend.dto.AssessmentRequest;
import com.studentplatform.backend.dto.AssessmentResponse;
import com.studentplatform.backend.entity.AssessmentEntity;
import com.studentplatform.backend.entity.AssessmentStatus;
import com.studentplatform.backend.entity.UserEntity;
import com.studentplatform.backend.exception.ApiException;
import com.studentplatform.backend.repository.AssessmentRepository;
import com.studentplatform.backend.repository.ScoreRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final ScoreRepository scoreRepository;

    public AssessmentService(AssessmentRepository assessmentRepository, ScoreRepository scoreRepository) {
        this.assessmentRepository = assessmentRepository;
        this.scoreRepository = scoreRepository;
    }

    @Transactional(readOnly = true)
    public List<AssessmentResponse> getAll() {
        return assessmentRepository.findAllByOrderByDateDesc().stream()
                .map(AssessmentResponse::from)
                .toList();
    }

    public AssessmentResponse create(AssessmentRequest request, UserEntity createdBy) {
        AssessmentEntity entity = new AssessmentEntity();
        apply(entity, request);
        entity.setCreatedBy(createdBy);
        return AssessmentResponse.from(assessmentRepository.save(entity));
    }

    public AssessmentResponse update(String id, AssessmentRequest request) {
        AssessmentEntity entity = assessmentRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Assessment not found."));
        apply(entity, request);
        return AssessmentResponse.from(assessmentRepository.save(entity));
    }

    public void delete(String id) {
        UUID assessmentId = UUID.fromString(id);
        if (!assessmentRepository.existsById(assessmentId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Assessment not found.");
        }
        scoreRepository.deleteByAssessmentId(assessmentId);
        assessmentRepository.deleteById(assessmentId);
    }

    private void apply(AssessmentEntity entity, AssessmentRequest request) {
        entity.setTitle(request.title().trim());
        entity.setSubject(request.subject().trim());
        entity.setDate(request.date().trim());
        entity.setMaxScore(request.maxScore());
        try {
            entity.setStatus(AssessmentStatus.valueOf(request.status().trim().toUpperCase()));
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid assessment status.");
        }
    }
}
