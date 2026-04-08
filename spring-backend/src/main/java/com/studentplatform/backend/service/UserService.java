package com.studentplatform.backend.service;

import com.studentplatform.backend.dto.ScoreResponse;
import com.studentplatform.backend.dto.StudentUpdateRequest;
import com.studentplatform.backend.dto.UserResponse;
import com.studentplatform.backend.entity.Role;
import com.studentplatform.backend.entity.UserEntity;
import com.studentplatform.backend.exception.ApiException;
import com.studentplatform.backend.repository.ScoreRepository;
import com.studentplatform.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final ScoreRepository scoreRepository;

    public UserService(UserRepository userRepository, ScoreRepository scoreRepository) {
        this.userRepository = userRepository;
        this.scoreRepository = scoreRepository;
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
        List<ScoreResponse> scores = scoreRepository.findByStudentIdOrderBySubmittedAtDesc(user.getId()).stream()
                .map(ScoreResponse::from)
                .toList();
        return Map.of("success", true, "student", UserResponse.from(user), "scores", scores);
    }

    public UserResponse updateStudent(String id, StudentUpdateRequest request) {
        UserEntity user = getStudentEntity(id);
        user.setName(request.name().trim());
        user.setEmail(request.email().trim().toLowerCase());
        user.setGrade(request.grade() == null ? "" : request.grade().trim());
        return UserResponse.from(userRepository.save(user));
    }

    public void deleteStudent(String id) {
        UserEntity user = getStudentEntity(id);
        scoreRepository.deleteByStudentId(user.getId());
        userRepository.delete(user);
    }

    @Transactional(readOnly = true)
    public List<ScoreResponse> getMyScores(UserEntity currentUser) {
        return scoreRepository.findByStudentIdOrderBySubmittedAtDesc(currentUser.getId()).stream()
                .map(ScoreResponse::from)
                .toList();
    }

    public UserEntity getStudentEntity(String id) {
        UserEntity user = userRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Student not found."));
        if (user.getRole() != Role.STUDENT) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Student not found.");
        }
        return user;
    }
}
