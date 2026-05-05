package com.studentplatform.backend.service;

import com.studentplatform.backend.dto.QuizAttemptRequest;
import com.studentplatform.backend.dto.QuizAttemptResponse;
import com.studentplatform.backend.dto.QuizRequest;
import com.studentplatform.backend.dto.QuizResponse;
import com.studentplatform.backend.dto.QuizSessionRequest;
import com.studentplatform.backend.dto.QuizSessionResponse;
import com.studentplatform.backend.entity.QuizAttemptEntity;
import com.studentplatform.backend.entity.QuizEntity;
import com.studentplatform.backend.entity.QuizSessionEntity;
import com.studentplatform.backend.entity.Role;
import com.studentplatform.backend.entity.SubjectEntity;
import com.studentplatform.backend.entity.UserEntity;
import com.studentplatform.backend.exception.ApiException;
import com.studentplatform.backend.repository.QuizAttemptRepository;
import com.studentplatform.backend.repository.QuizRepository;
import com.studentplatform.backend.repository.QuizSessionRepository;
import com.studentplatform.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@Transactional
public class QuizService {

    private final QuizRepository quizRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizSessionRepository quizSessionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final SubjectService subjectService;

    public QuizService(
            QuizRepository quizRepository,
            QuizAttemptRepository quizAttemptRepository,
            QuizSessionRepository quizSessionRepository,
            UserRepository userRepository,
            NotificationService notificationService,
            SubjectService subjectService
    ) {
        this.quizRepository = quizRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.quizSessionRepository = quizSessionRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.subjectService = subjectService;
    }

    @Transactional(readOnly = true)
    public List<QuizResponse> getAll(UserEntity currentUser) {
        List<QuizEntity> quizzes;
        if (currentUser.getRole().isStaff()) {
            quizzes = quizRepository.findAllByOrderByCreatedAtDesc();
        } else {
            String grade = currentUser.getGrade() == null ? "" : currentUser.getGrade().trim();
            quizzes = grade.isBlank()
                    ? quizRepository.findByStatusOrderByCreatedAtDesc("published")
                    : quizRepository.findByStatusAndClassNameIgnoreCaseOrderByCreatedAtDesc("published", grade);
        }

        var subjectNamesById = subjectService.resolveSubjectNamesById(
                quizzes.stream()
                        .map(QuizEntity::getSubjectId)
                        .toList()
        );

        return quizzes.stream()
                .map(quiz -> toResponse(quiz, subjectNamesById))
                .toList();
    }

    public QuizResponse create(QuizRequest request) {
        QuizEntity quiz = new QuizEntity();
        SubjectEntity subject = apply(quiz, request);
        quiz.prepareForSave();
        QuizEntity saved = quizRepository.save(quiz);

        if ("published".equals(saved.getStatus())) {
            notificationService.notifyStudentsByGrade(
                    saved.getClassName(),
                    "New quiz published",
                    saved.getTitle() + " is available in your quizzes.",
                    "info",
                    null,
                    "quiz",
                    "/quizzes/library/subject?subject=" + encodeUrlValue(saved.getLegacySubject()) + "&focusQuiz=" + saved.getId()
            );
        }

        return QuizResponse.from(saved, subject.getName());
    }

    public QuizResponse update(String id, QuizRequest request) {
        QuizEntity quiz = quizRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Quiz not found."));
        SubjectEntity subject = apply(quiz, request);
        quiz.prepareForSave();
        QuizEntity saved = quizRepository.save(quiz);

        if ("published".equals(saved.getStatus())) {
            notificationService.notifyStudentsByGrade(
                    saved.getClassName(),
                    "Quiz updated",
                    saved.getTitle() + " has been updated.",
                    "info",
                    null,
                    "quiz",
                    "/quizzes/library/subject?subject=" + encodeUrlValue(saved.getLegacySubject()) + "&focusQuiz=" + saved.getId()
            );
        }

        return QuizResponse.from(saved, subject.getName());
    }

    public void delete(String id) {
        if (!quizRepository.existsById(id)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Quiz not found.");
        }
        quizSessionRepository.deleteByQuizId(id);
        quizAttemptRepository.deleteByQuizId(id);
        quizRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<QuizAttemptResponse> getAttempts(UserEntity currentUser) {
        List<QuizAttemptEntity> attempts = currentUser.getRole().isStaff()
                ? quizAttemptRepository.findAllByOrderBySubmittedAtDesc()
                : quizAttemptRepository.findByStudentIdOrderBySubmittedAtDesc(currentUser.getId());

        if (currentUser.getRole().isStaff()) {
            attempts = attempts.stream()
                    .filter(this::retainAttemptForExistingStudent)
                    .toList();
        }

        return attempts.stream()
                .map(QuizAttemptResponse::from)
                .toList();
    }

    public QuizAttemptResponse submitAttempt(String quizId, QuizAttemptRequest request, UserEntity currentUser) {
        if (currentUser.getRole() != Role.STUDENT) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only learners can submit quiz attempts.");
        }

        QuizEntity quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Quiz not found."));

        if (!"published".equals(quiz.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Quiz is not open for attempts.");
        }

        if (quiz.getDeadlineAt() != null && quiz.getDeadlineAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Quiz deadline has passed.");
        }

        List<Integer> answers = request.answers() == null ? List.of() : request.answers();
        int score = 0;
        List<QuizEntity.QuizQuestion> questions = quiz.getQuestions() == null ? List.of() : quiz.getQuestions();
        for (int index = 0; index < questions.size(); index++) {
            QuizEntity.QuizQuestion question = questions.get(index);
            int answer = index < answers.size() ? answers.get(index) : -1;
            if (answer == question.getCorrectOption()) {
                score += question.getPoints() == null ? 0 : question.getPoints();
            }
        }

        QuizAttemptEntity saved = saveAttempt(quiz, currentUser, answers, score, Instant.now());
        quizSessionRepository.findByQuizIdAndStudentId(quizId, currentUser.getId())
                .ifPresent(quizSessionRepository::delete);
        notifyAdminsAboutSubmission(currentUser, quiz);
        return QuizAttemptResponse.from(saved);
    }

    public QuizSessionResponse startSession(String quizId, UserEntity currentUser) {
        if (currentUser.getRole() != Role.STUDENT) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only learners can start quiz attempts.");
        }

        QuizEntity quiz = validateOpenQuiz(quizId);

        if (quizAttemptRepository.findByQuizIdAndStudentId(quizId, currentUser.getId()).isPresent()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Quiz has already been submitted.");
        }

        QuizSessionEntity session = quizSessionRepository.findByQuizIdAndStudentId(quizId, currentUser.getId())
                .orElseGet(QuizSessionEntity::new);

        if (session.getEndsAt() == null) {
            session.setQuizId(quiz.getId());
            session.setStudentId(currentUser.getId());
            session.setStudentName(currentUser.getName());
            session.setStudentEmail(currentUser.getEmail());
            session.setClassName(quiz.getClassName());
            session.setAnswers(new ArrayList<>(defaultAnswers(quiz)));
            session.setCurrentQuestionIndex(0);
            session.setStartedAt(Instant.now());
            session.setEndsAt(Instant.now().plusSeconds(Math.round(quiz.getDurationMinutes() * 60L)));
        }

        session.prepareForSave();
        return QuizSessionResponse.from(quizSessionRepository.save(session));
    }

    public QuizSessionResponse updateSession(String quizId, QuizSessionRequest request, UserEntity currentUser) {
        if (currentUser.getRole() != Role.STUDENT) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only learners can update quiz attempts.");
        }

        QuizEntity quiz = validateOpenQuiz(quizId);
        QuizSessionEntity session = quizSessionRepository.findByQuizIdAndStudentId(quizId, currentUser.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Active quiz session not found."));

        if (request.answers() != null) {
            session.setAnswers(normalizeAnswers(request.answers(), quiz));
        }
        if (request.currentQuestionIndex() != null) {
            int lastIndex = Math.max((quiz.getQuestions() == null ? 0 : quiz.getQuestions().size()) - 1, 0);
            session.setCurrentQuestionIndex(Math.max(0, Math.min(request.currentQuestionIndex(), lastIndex)));
        }

        session.prepareForSave();
        return QuizSessionResponse.from(quizSessionRepository.save(session));
    }

    @Scheduled(fixedDelayString = "${app.quiz.auto-submit-interval-ms:15000}")
    public void autoSubmitExpiredSessions() {
        List<QuizSessionEntity> expiredSessions = quizSessionRepository.findByEndsAtLessThanEqual(Instant.now());
        for (QuizSessionEntity session : expiredSessions) {
            try {
                autoSubmitSession(session);
            } catch (Exception error) {
                System.err.println("[QuizService] Failed to auto-submit quiz session " + session.getId() + ": " + error.getMessage());
            }
        }
    }

    private void autoSubmitSession(QuizSessionEntity session) {
        if (quizAttemptRepository.findByQuizIdAndStudentId(session.getQuizId(), session.getStudentId()).isPresent()) {
            quizSessionRepository.delete(session);
            return;
        }

        QuizEntity quiz = quizRepository.findById(session.getQuizId()).orElse(null);
        if (quiz == null) {
            quizSessionRepository.delete(session);
            return;
        }

        List<Integer> answers = normalizeAnswers(session.getAnswers(), quiz);
        int score = calculateScore(quiz, answers);

        QuizAttemptEntity attempt = quizAttemptRepository.findByQuizIdAndStudentId(session.getQuizId(), session.getStudentId())
                .orElseGet(QuizAttemptEntity::new);
        attempt.setQuizId(quiz.getId());
        attempt.setStudentId(session.getStudentId());
        attempt.setStudentName(session.getStudentName());
        attempt.setStudentEmail(session.getStudentEmail());
        attempt.setClassName(session.getClassName());
        attempt.setAnswers(new ArrayList<>(answers));
        attempt.setScore(score);
        attempt.setTotalPoints(quiz.getTotalPoints());
        attempt.setSubmittedAt(session.getEndsAt() == null ? Instant.now() : session.getEndsAt());
        attempt.prepareForSave();
        QuizAttemptEntity savedAttempt = quizAttemptRepository.save(attempt);
        quizSessionRepository.delete(session);

        notificationService.notifyStaff(
                "Quiz auto-submitted",
                session.getStudentName() + "'s " + quiz.getTitle() + " attempt was auto-submitted when time ended.",
                "info",
                session.getStudentId(),
                "quiz-submission",
                "/quizzes?focusAttempt=" + savedAttempt.getId()
        );
    }

    private boolean retainAttemptForExistingStudent(QuizAttemptEntity attempt) {
        boolean exists = userRepository.existsById(attempt.getStudentId());
        if (!exists) {
            quizAttemptRepository.delete(attempt);
        }
        return exists;
    }

    private SubjectEntity apply(QuizEntity entity, QuizRequest request) {
        String title = normalizeRequired(request.title(), "Quiz title is required.");
        String className = normalizeRequired(request.className(), "Academic year is required.");
        SubjectEntity subject = subjectService.resolveSubject(request.subjectId(), request.subject());
        subjectService.validateSubjectYear(subject, className);
        Integer durationMinutes = request.durationMinutes();
        if (durationMinutes == null || durationMinutes < 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Duration must be at least 1 minute.");
        }

        String status = request.status() == null ? "draft" : request.status().trim().toLowerCase(Locale.ROOT);
        if (!status.equals("draft") && !status.equals("published") && !status.equals("closed")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid quiz status.");
        }

        List<QuizRequest.QuizQuestionRequest> questionRequests = request.questions();
        if (questionRequests == null || questionRequests.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "At least one question is required.");
        }

        List<QuizEntity.QuizQuestion> questions = new ArrayList<>();
        for (QuizRequest.QuizQuestionRequest source : questionRequests) {
            String prompt = normalizeRequired(source.prompt(), "Each question must have a prompt.");
            List<String> options = source.options() == null ? List.of() : source.options();
            if (options.size() != 4) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Each question must have exactly 4 options.");
            }

            List<String> cleanOptions = options.stream()
                    .map(option -> option == null ? "" : option.trim())
                    .toList();
            if (cleanOptions.stream().anyMatch(String::isBlank)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Each option must be filled.");
            }

            Integer correctOption = source.correctOption();
            if (correctOption == null || correctOption < 0 || correctOption > 3) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Correct option must be between 0 and 3.");
            }

            Integer points = source.points();
            if (points == null || points < 1) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Question points must be at least 1.");
            }

            QuizEntity.QuizQuestion question = new QuizEntity.QuizQuestion();
            question.setId(source.id() == null || source.id().isBlank() ? UUID.randomUUID().toString() : source.id().trim());
            question.setPrompt(prompt);
            question.setOptions(new ArrayList<>(cleanOptions));
            question.setCorrectOption(correctOption);
            question.setPoints(points);
            questions.add(question);
        }

        entity.setTitle(title);
        entity.setSubjectId(subject.getId());
        entity.setLegacySubject(subject.getName());
        entity.setClassName(subject.getYearId());
        entity.setDescription(request.description() == null ? "" : request.description().trim());
        entity.setDeadlineAt(request.deadlineAt());
        entity.setDurationMinutes(durationMinutes);
        entity.setStatus(status);
        entity.setQuestions(questions);
        return subject;
    }

    private QuizResponse toResponse(QuizEntity quiz, java.util.Map<String, String> subjectNamesById) {
        String subjectName = quiz.getSubjectId() == null ? null : subjectNamesById.get(quiz.getSubjectId());
        return QuizResponse.from(quiz, subjectService.resolveSubjectName(null, subjectName == null ? quiz.getLegacySubject() : subjectName));
    }

    private QuizEntity validateOpenQuiz(String quizId) {
        QuizEntity quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Quiz not found."));

        if (!"published".equals(quiz.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Quiz is not open for attempts.");
        }

        if (quiz.getDeadlineAt() != null && quiz.getDeadlineAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Quiz deadline has passed.");
        }

        return quiz;
    }

    private List<Integer> defaultAnswers(QuizEntity quiz) {
        int count = quiz.getQuestions() == null ? 0 : quiz.getQuestions().size();
        List<Integer> answers = new ArrayList<>();
        for (int index = 0; index < count; index++) {
            answers.add(-1);
        }
        return answers;
    }

    private List<Integer> normalizeAnswers(List<Integer> answers, QuizEntity quiz) {
        List<Integer> normalized = new ArrayList<>(defaultAnswers(quiz));
        for (int index = 0; index < normalized.size() && index < answers.size(); index++) {
            Integer answer = answers.get(index);
            normalized.set(index, answer == null ? -1 : answer);
        }
        return normalized;
    }

    private int calculateScore(QuizEntity quiz, List<Integer> answers) {
        int score = 0;
        List<QuizEntity.QuizQuestion> questions = quiz.getQuestions() == null ? List.of() : quiz.getQuestions();
        for (int index = 0; index < questions.size(); index++) {
            QuizEntity.QuizQuestion question = questions.get(index);
            int answer = index < answers.size() ? answers.get(index) : -1;
            if (answer == question.getCorrectOption()) {
                score += question.getPoints() == null ? 0 : question.getPoints();
            }
        }
        return score;
    }

    private QuizAttemptEntity saveAttempt(QuizEntity quiz, UserEntity currentUser, List<Integer> answers, int score, Instant submittedAt) {
        QuizAttemptEntity attempt = quizAttemptRepository.findByQuizIdAndStudentId(quiz.getId(), currentUser.getId())
                .orElseGet(QuizAttemptEntity::new);
        attempt.setQuizId(quiz.getId());
        attempt.setStudentId(currentUser.getId());
        attempt.setStudentName(currentUser.getName());
        attempt.setStudentEmail(currentUser.getEmail());
        attempt.setClassName(quiz.getClassName());
        attempt.setAnswers(new ArrayList<>(answers));
        attempt.setScore(score);
        attempt.setTotalPoints(quiz.getTotalPoints());
        attempt.setSubmittedAt(submittedAt);
        attempt.prepareForSave();
        return quizAttemptRepository.save(attempt);
    }

    private void notifyAdminsAboutSubmission(UserEntity currentUser, QuizEntity quiz) {
        QuizAttemptEntity attempt = quizAttemptRepository.findByQuizIdAndStudentId(quiz.getId(), currentUser.getId()).orElse(null);
        notificationService.notifyStaff(
                "Quiz submission",
                currentUser.getName() + " submitted " + quiz.getTitle() + ".",
                "info",
                currentUser.getId(),
                "quiz-submission",
                attempt == null ? "/quizzes?attemptSearch=" + encodeUrlValue(quiz.getTitle()) : "/quizzes?focusAttempt=" + attempt.getId()
        );
    }

    private String encodeUrlValue(String value) {
        if (value == null) {
            return "";
        }
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String normalizeRequired(String value, String message) {
        if (value == null || value.trim().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }
}
