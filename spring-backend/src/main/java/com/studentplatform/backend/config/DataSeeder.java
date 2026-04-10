package com.studentplatform.backend.config;

import com.studentplatform.backend.entity.AssignmentEntity;
import com.studentplatform.backend.entity.AssessmentEntity;
import com.studentplatform.backend.entity.AssessmentStatus;
import com.studentplatform.backend.entity.Role;
import com.studentplatform.backend.entity.ScoreEntity;
import com.studentplatform.backend.entity.SubmissionEntity;
import com.studentplatform.backend.entity.SubmissionStatus;
import com.studentplatform.backend.entity.UserEntity;
import com.studentplatform.backend.repository.AssignmentRepository;
import com.studentplatform.backend.repository.AssessmentRepository;
import com.studentplatform.backend.repository.ScoreRepository;
import com.studentplatform.backend.repository.SubmissionRepository;
import com.studentplatform.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final AssignmentRepository assignmentRepository;
    private final AssessmentRepository assessmentRepository;
    private final SubmissionRepository submissionRepository;
    private final ScoreRepository scoreRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.admin-email}")
    private String adminEmail;

    @Value("${app.seed.admin-password}")
    private String adminPassword;

    @Value("${app.seed.admin-name}")
    private String adminName;

    @Value("${app.seed.enabled:false}")
    private boolean seedDemoData;

    public DataSeeder(
            UserRepository userRepository,
            AssignmentRepository assignmentRepository,
            AssessmentRepository assessmentRepository,
            SubmissionRepository submissionRepository,
            ScoreRepository scoreRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.assignmentRepository = assignmentRepository;
        this.assessmentRepository = assessmentRepository;
        this.submissionRepository = submissionRepository;
        this.scoreRepository = scoreRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        UserEntity admin = userRepository.findByEmail(adminEmail.toLowerCase().trim()).orElseGet(() -> {
            UserEntity user = new UserEntity();
            user.setName(adminName);
            user.setEmail(adminEmail);
            user.setPassword(passwordEncoder.encode(adminPassword));
            user.setRole(Role.ADMIN);
            user.prepareForSave();
            return userRepository.save(user);
        });

        if (!seedDemoData || userRepository.countByRole(Role.STUDENT) > 0 || assessmentRepository.count() > 0) {
            return;
        }

        UserEntity alice = createStudent("Alice Johnson", "alice@studentplatform.local", "10");
        UserEntity bob = createStudent("Bob Martinez", "bob@studentplatform.local", "9");
        UserEntity carol = createStudent("Carol White", "carol@studentplatform.local", "11");

        AssessmentEntity algebra = createAssessment(admin, "Algebra Midterm", "Mathematics", "2026-04-20", 100, AssessmentStatus.UPCOMING);
        AssessmentEntity physics = createAssessment(admin, "Physics Lab", "Science", "2026-03-20", 50, AssessmentStatus.COMPLETED);
        AssessmentEntity history = createAssessment(admin, "World History Quiz", "History", "2026-03-28", 40, AssessmentStatus.GRADING);

        createScore(alice, physics, 45, "Strong practical work");
        createScore(alice, history, 34, "Good recall");
        createScore(bob, physics, 39, "Keep practicing graph analysis");
        createScore(carol, physics, 48, "Excellent work");

        AssignmentEntity essay = createAssignment(
                admin,
                "Industrial Revolution Essay",
                "History",
                "10",
                "Write a 600-word essay explaining how the Industrial Revolution changed daily life.",
                25,
                java.time.LocalDateTime.now().plusDays(5)
        );
        AssignmentEntity worksheet = createAssignment(
                admin,
                "Quadratic Equations Worksheet",
                "Mathematics",
                "9",
                "Solve all ten quadratic equations and show your working clearly.",
                20,
                java.time.LocalDateTime.now().plusDays(3)
        );

        createSubmission(alice, essay, "Essay draft covering factories, transport, and urban growth.", null, null, 22);
        createSubmission(bob, worksheet, null, "quadratic-solutions.txt", "data:text/plain;base64,U29sdXRpb25zIGZvciB0aGUgd29ya3NoZWV0Lg==", null);
    }

    private UserEntity createStudent(String name, String email, String grade) {
        UserEntity user = new UserEntity();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode("Student@123"));
        user.setRole(Role.STUDENT);
        user.setGrade(grade);
        user.prepareForSave();
        return userRepository.save(user);
    }

    private AssessmentEntity createAssessment(
            UserEntity admin,
            String title,
            String subject,
            String date,
            int maxScore,
            AssessmentStatus status
    ) {
        AssessmentEntity assessment = new AssessmentEntity();
        assessment.setCreatedBy(admin);
        assessment.setTitle(title);
        assessment.setSubject(subject);
        assessment.setDate(date);
        assessment.setMaxScore(maxScore);
        assessment.setStatus(status);
        assessment.prepareForSave();
        return assessmentRepository.save(assessment);
    }

    private void createScore(UserEntity student, AssessmentEntity assessment, int scoreValue, String feedback) {
        ScoreEntity score = new ScoreEntity();
        score.setStudent(student);
        score.setAssessment(assessment);
        score.setScore(scoreValue);
        score.setFeedback(feedback);
        score.prepareForSave();
        scoreRepository.save(score);
    }

    private AssignmentEntity createAssignment(
            UserEntity admin,
            String title,
            String subject,
            String className,
            String description,
            int totalMarks,
            java.time.LocalDateTime deadline
    ) {
        AssignmentEntity assignment = new AssignmentEntity();
        assignment.setCreatedBy(admin);
        assignment.setTitle(title);
        assignment.setSubject(subject);
        assignment.setClassName(className);
        assignment.setDescription(description);
        assignment.setTotalMarks(totalMarks);
        assignment.setDeadline(deadline);
        assignment.prepareForSave();
        return assignmentRepository.save(assignment);
    }

    private void createSubmission(
            UserEntity student,
            AssignmentEntity assignment,
            String content,
            String fileName,
            String fileContent,
            Integer marks
    ) {
        SubmissionEntity submission = new SubmissionEntity();
        submission.setStudent(student);
        submission.setAssignment(assignment);
        submission.setContent(content);
        submission.setFileName(fileName);
        submission.setFileContent(fileContent);
        submission.setMarks(marks);
        submission.setStatus(marks == null ? SubmissionStatus.SUBMITTED : SubmissionStatus.GRADED);
        submission.prepareForSave();
        submissionRepository.save(submission);
    }
}
