package com.studentplatform.backend.service;

import com.studentplatform.backend.dto.ScoreResponse;
import com.studentplatform.backend.dto.StudentUpdateRequest;
import com.studentplatform.backend.dto.UserResponse;
import com.studentplatform.backend.entity.Role;
import com.studentplatform.backend.entity.UserEntity;
import com.studentplatform.backend.exception.ApiException;
import com.studentplatform.backend.repository.QuizAttemptRepository;
import com.studentplatform.backend.repository.QuizSessionRepository;
import com.studentplatform.backend.repository.ScoreRepository;
import com.studentplatform.backend.repository.SubmissionRepository;
import com.studentplatform.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final ScoreRepository scoreRepository;
    private final SubmissionRepository submissionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizSessionRepository quizSessionRepository;
    private final NotificationService notificationService;

    public UserService(
            UserRepository userRepository,
            ScoreRepository scoreRepository,
            SubmissionRepository submissionRepository,
            QuizAttemptRepository quizAttemptRepository,
            QuizSessionRepository quizSessionRepository,
            NotificationService notificationService
    ) {
        this.userRepository = userRepository;
        this.scoreRepository = scoreRepository;
        this.submissionRepository = submissionRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.quizSessionRepository = quizSessionRepository;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getStudents() {
        return userRepository.findAllByRoleOrderByCreatedAtDesc(Role.STUDENT).stream()
                .map(UserResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse getStudent(String id) {
        UserEntity user = getStudentEntity(id);
        return UserResponse.from(user);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStudentDetails(String id) {
        UserEntity user = getStudentEntity(id);
        List<ScoreResponse> scores = scoreRepository.findByStudent_IdOrderBySubmittedAtDesc(user.getId()).stream()
                .map(ScoreResponse::from)
                .toList();
        return Map.of("success", true, "student", UserResponse.from(user), "scores", scores);
    }

    public UserResponse updateStudent(String id, StudentUpdateRequest request) {
        UserEntity user = getStudentEntity(id);
        applyUpdate(user, request);
        UserEntity saved = userRepository.save(user);

        notificationService.notifyUsersByIds(
                List.of(saved.getId()),
                "Profile updated",
                "Your profile details were updated by admin.",
                "info",
                null
        );

        return UserResponse.from(saved);
    }

    public UserResponse updateCurrentUser(UserEntity currentUser, StudentUpdateRequest request) {
        applyUpdate(currentUser, request);
        UserEntity saved = userRepository.save(currentUser);

        if (saved.getRole() == Role.STUDENT) {
            notificationService.notifyRole(
                    Role.ADMIN,
                    "Student profile updated",
                    saved.getName() + " updated profile information.",
                    "info",
                    saved.getId()
            );
        }

        return UserResponse.from(saved);
    }

    private void applyUpdate(UserEntity user, StudentUpdateRequest request) {
        user.setName(request.name().trim());
        user.setEmail(request.email().trim().toLowerCase());
        if (user.getRole() == Role.STUDENT) {
            user.setGrade(request.grade() == null ? "" : request.grade().trim());
        }
        user.prepareForSave();
    }

    public void deleteStudent(String id) {
        UserEntity user = getStudentEntity(id);
        scoreRepository.deleteByStudent_Id(user.getId());
        submissionRepository.deleteByStudent_Id(user.getId());
        quizAttemptRepository.deleteByStudentId(user.getId());
        quizSessionRepository.deleteByStudentId(user.getId());
        userRepository.delete(user);
    }

    @Transactional(readOnly = true)
    public List<ScoreResponse> getMyScores(UserEntity currentUser) {
        return scoreRepository.findByStudent_IdOrderBySubmittedAtDesc(currentUser.getId()).stream()
                .map(ScoreResponse::from)
                .toList();
    }

    public UserEntity getStudentEntity(String id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Student not found."));
        if (user.getRole() != Role.STUDENT) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Student not found.");
        }
        return user;
    }
}
