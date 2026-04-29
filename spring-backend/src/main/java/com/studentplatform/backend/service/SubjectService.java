package com.studentplatform.backend.service;

import com.studentplatform.backend.dto.CreateSubjectRequest;
import com.studentplatform.backend.dto.SubjectResponse;
import com.studentplatform.backend.dto.YearResponse;
import com.studentplatform.backend.entity.SubjectEntity;
import com.studentplatform.backend.entity.YearEntity;
import com.studentplatform.backend.exception.ApiException;
import com.studentplatform.backend.repository.SubjectRepository;
import com.studentplatform.backend.repository.AssignmentRepository;
import com.studentplatform.backend.repository.QuizRepository;
import com.studentplatform.backend.repository.YearRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final YearRepository yearRepository;
    private final AssignmentRepository assignmentRepository;
    private final QuizRepository quizRepository;

    public SubjectService(
            SubjectRepository subjectRepository,
            YearRepository yearRepository,
            AssignmentRepository assignmentRepository,
            QuizRepository quizRepository
    ) {
        this.subjectRepository = subjectRepository;
        this.yearRepository = yearRepository;
        this.assignmentRepository = assignmentRepository;
        this.quizRepository = quizRepository;
    }

    public List<YearResponse> getYears() {
        return yearRepository.findAll(Sort.by(Sort.Direction.ASC, "code")).stream()
                .map(YearResponse::from)
                .toList();
    }

    public List<SubjectResponse> getAll() {
        return mapSubjects(subjectRepository.findAll(Sort.by(Sort.Order.asc("yearId"), Sort.Order.asc("name"))));
    }

    public List<SubjectResponse> getByYear(String yearId) {
        String normalizedYearId = normalizeRequired(yearId, "Year is required.");
        ensureYearExists(normalizedYearId);
        return mapSubjects(subjectRepository.findByYearIdOrderByNameAsc(normalizedYearId));
    }

    @Transactional
    public SubjectResponse create(CreateSubjectRequest request) {
        String name = normalizeSubjectName(request.name());
        String yearId = normalizeRequired(request.yearId(), "Year is required.");

        YearEntity year = yearRepository.findById(yearId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Year not found."));

        subjectRepository.findByNormalizedName(name.toLowerCase(Locale.ROOT))
                .ifPresent(existing -> {
                    throw new ApiException(HttpStatus.CONFLICT, "Subject name already exists.");
                });

        SubjectEntity subject = new SubjectEntity();
        subject.setName(name);
        subject.setYearId(yearId);
        subject.prepareForSave();

        try {
            SubjectEntity savedSubject = subjectRepository.save(subject);
            return SubjectResponse.from(savedSubject, year);
        } catch (DuplicateKeyException ex) {
            throw new ApiException(HttpStatus.CONFLICT, "Subject name already exists.");
        }
    }

    @Transactional
    public void delete(String subjectId) {
        String normalizedSubjectId = normalizePlainRequired(subjectId, "Subject is required.");
        SubjectEntity subject = subjectRepository.findById(normalizedSubjectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Subject not found."));

        if (assignmentRepository.existsBySubjectId(normalizedSubjectId) || quizRepository.existsBySubjectId(normalizedSubjectId)) {
            throw new ApiException(HttpStatus.CONFLICT, "This subject is already used in assignments or quizzes, so it cannot be removed.");
        }

        subjectRepository.deleteById(subject.getId());
    }

    public SubjectEntity resolveSubject(String subjectId, String fallbackName) {
        if (subjectId != null && !subjectId.trim().isBlank()) {
            return subjectRepository.findById(subjectId.trim())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Selected subject was not found."));
        }

        if (fallbackName != null && !fallbackName.trim().isBlank()) {
            return subjectRepository.findByNormalizedName(fallbackName.trim().toLowerCase(Locale.ROOT))
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Selected subject was not found."));
        }

        throw new ApiException(HttpStatus.BAD_REQUEST, "Subject is required.");
    }

    public void validateSubjectYear(SubjectEntity subject, String yearId) {
        String normalizedYearId = normalizeRequired(yearId, "Academic year is required.");
        if (!normalizedYearId.equalsIgnoreCase(subject.getYearId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Selected subject does not belong to the selected year.");
        }
    }

    public String resolveSubjectName(SubjectEntity subject, String legacyName) {
        if (subject != null && subject.getName() != null && !subject.getName().isBlank()) {
            return subject.getName();
        }
        return legacyName == null ? "" : legacyName;
    }

    private void ensureYearExists(String yearId) {
        if (!yearRepository.existsById(yearId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Year not found.");
        }
    }

    private List<SubjectResponse> mapSubjects(List<SubjectEntity> subjects) {
        Map<String, YearEntity> yearsById = new HashMap<>();
        yearRepository.findAll().forEach((year) -> yearsById.put(year.getId(), year));

        return subjects.stream()
                .map((subject) -> SubjectResponse.from(subject, yearsById.get(subject.getYearId())))
                .toList();
    }

    private String normalizeSubjectName(String value) {
        if (value == null || value.trim().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Subject name is required.");
        }
        return value.trim();
    }

    private String normalizeRequired(String value, String message) {
        if (value == null || value.trim().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizePlainRequired(String value, String message) {
        if (value == null || value.trim().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }
}
