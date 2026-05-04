package com.studentplatform.backend.service;

import com.studentplatform.backend.dto.FacultyAccessResponse;
import com.studentplatform.backend.dto.FacultyAccessUpdateRequest;
import com.studentplatform.backend.dto.ScoreResponse;
import com.studentplatform.backend.dto.StudentAccessUpdateRequest;
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
import org.bson.Document;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.time.Instant;
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
    private final MongoTemplate mongoTemplate;

    public UserService(
            UserRepository userRepository,
            ScoreRepository scoreRepository,
            SubmissionRepository submissionRepository,
            QuizAttemptRepository quizAttemptRepository,
            QuizSessionRepository quizSessionRepository,
            NotificationService notificationService,
            MongoTemplate mongoTemplate
    ) {
        this.userRepository = userRepository;
        this.scoreRepository = scoreRepository;
        this.submissionRepository = submissionRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.quizSessionRepository = quizSessionRepository;
        this.notificationService = notificationService;
        this.mongoTemplate = mongoTemplate;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getStudents() {
        return userRepository.findAllByRoleOrderByCreatedAtDesc(Role.STUDENT).stream()
                .map(UserResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FacultyAccessResponse> getFacultyMembers() {
        Query query = new Query(
                Criteria.where("role").in("FACULTY", "faculty", "Faculty", "TEACHER", "teacher", "Teacher")
        ).with(Sort.by(Sort.Direction.ASC, "name"));

        return mongoTemplate.find(query, Document.class, "users").stream()
                .map(this::mapFacultyDocument)
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

    public UserResponse updateStudentAccess(String id, StudentAccessUpdateRequest request) {
        UserEntity student = getStudentEntity(id);

        if (request == null || request.blockedUntil() == null || request.blockedUntil().isBlank()) {
            student.setAccessBlockedUntil(null);
            student.setAccessBlockReason(null);
        } else {
            Instant blockedUntil;
            try {
                blockedUntil = Instant.parse(request.blockedUntil().trim());
            } catch (Exception exception) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid block-until date and time.");
            }

            if (!blockedUntil.isAfter(Instant.now())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Block-until time must be in the future.");
            }

            student.setAccessBlockedUntil(blockedUntil);
            student.setAccessBlockReason(request.reason() == null || request.reason().isBlank()
                    ? "Access paused temporarily by admin."
                    : request.reason().trim());
        }

        UserEntity saved = userRepository.save(student);
        boolean blocked = saved.hasActiveAccessBlock(Instant.now());

        notificationService.notifyUsersByIds(
                List.of(saved.getId()),
                blocked ? "Student access paused" : "Student access restored",
                blocked
                        ? "Your learner portal access has been paused temporarily by admin."
                        : "Your learner portal access has been restored by admin.",
                blocked ? "warning" : "success",
                null
        );

        return UserResponse.from(saved);
    }

    public UserResponse updateCurrentUser(UserEntity currentUser, StudentUpdateRequest request) {
        applyUpdate(currentUser, request);
        UserEntity saved = userRepository.save(currentUser);

        if (saved.getRole() == Role.STUDENT) {
            notificationService.notifyStaff(
                    "Student profile updated",
                    saved.getName() + " updated profile information.",
                    "info",
                    saved.getId()
            );
        }

        return UserResponse.from(saved);
    }

    public FacultyAccessResponse updateFacultyAccess(String id, FacultyAccessUpdateRequest request) {
        UserEntity faculty = getFacultyEntity(id);

        if (request == null || request.blockedUntil() == null || request.blockedUntil().isBlank()) {
            faculty.setAccessBlockedUntil(null);
            faculty.setAccessBlockReason(null);
        } else {
            Instant blockedUntil;
            try {
                blockedUntil = Instant.parse(request.blockedUntil().trim());
            } catch (Exception exception) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid block-until date and time.");
            }

            if (!blockedUntil.isAfter(Instant.now())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Block-until time must be in the future.");
            }

            faculty.setAccessBlockedUntil(blockedUntil);
            faculty.setAccessBlockReason(request.reason() == null || request.reason().isBlank()
                    ? "Access paused temporarily by admin."
                    : request.reason().trim());
        }

        UserEntity saved = userRepository.save(faculty);
        boolean blocked = saved.hasActiveAccessBlock(Instant.now());

        notificationService.notifyUsersByIds(
                List.of(saved.getId()),
                blocked ? "Faculty access paused" : "Faculty access restored",
                blocked
                        ? "Your faculty portal access has been paused temporarily by admin."
                        : "Your faculty portal access has been restored by admin.",
                blocked ? "warning" : "success",
                null
        );

        return FacultyAccessResponse.from(saved);
    }

    public void deleteFaculty(String id) {
        UserEntity faculty = getFacultyEntity(id);
        userRepository.delete(faculty);
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

    public UserEntity getFacultyEntity(String id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Faculty member not found."));
        if (user.getRole() != Role.FACULTY) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Faculty member not found.");
        }
        return user;
    }

    public void ensureFacultyAccessAllowed(UserEntity user) {
        if (user.getRole() == Role.FACULTY && user.hasActiveAccessBlock(Instant.now())) {
            String until = user.getAccessBlockedUntil() == null ? "" : " until " + user.getAccessBlockedUntil();
            throw new ApiException(HttpStatus.FORBIDDEN, "Your account access is temporarily blocked" + until + ".");
        }
    }

    private FacultyAccessResponse mapFacultyDocument(Document document) {
        String id = document.getObjectId("_id") != null
                ? document.getObjectId("_id").toHexString()
                : String.valueOf(document.get("_id"));

        return FacultyAccessResponse.fromRaw(
                id,
                document.getString("name"),
                document.getString("email"),
                document.getString("role"),
                toInstant(document.get("createdAt")),
                toInstant(document.get("accessBlockedUntil")),
                document.getString("accessBlockReason")
        );
    }

    private Instant toInstant(Object value) {
        if (value instanceof Instant instant) {
            return instant;
        }
        if (value instanceof Date date) {
            return date.toInstant();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Instant.parse(text);
            } catch (Exception ignored) {
                return null;
            }
        }
        return null;
    }
}
