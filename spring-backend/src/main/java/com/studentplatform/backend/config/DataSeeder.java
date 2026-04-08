package com.studentplatform.backend.config;

import com.studentplatform.backend.entity.AssessmentEntity;
import com.studentplatform.backend.entity.AssessmentStatus;
import com.studentplatform.backend.entity.Role;
import com.studentplatform.backend.entity.ScoreEntity;
import com.studentplatform.backend.entity.UserEntity;
import com.studentplatform.backend.repository.AssessmentRepository;
import com.studentplatform.backend.repository.ScoreRepository;
import com.studentplatform.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final AssessmentRepository assessmentRepository;
    private final ScoreRepository scoreRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.admin-email}")
    private String adminEmail;

    @Value("${app.seed.admin-password}")
    private String adminPassword;

    @Value("${app.seed.admin-name}")
    private String adminName;

    public DataSeeder(
            UserRepository userRepository,
            AssessmentRepository assessmentRepository,
            ScoreRepository scoreRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.assessmentRepository = assessmentRepository;
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
            return userRepository.save(user);
        });

        if (userRepository.countByRole(Role.STUDENT) > 0 || assessmentRepository.count() > 0) {
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
    }

    private UserEntity createStudent(String name, String email, String grade) {
        UserEntity user = new UserEntity();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode("Student@123"));
        user.setRole(Role.STUDENT);
        user.setGrade(grade);
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
        return assessmentRepository.save(assessment);
    }

    private void createScore(UserEntity student, AssessmentEntity assessment, int scoreValue, String feedback) {
        ScoreEntity score = new ScoreEntity();
        score.setStudent(student);
        score.setAssessment(assessment);
        score.setScore(scoreValue);
        score.setFeedback(feedback);
        scoreRepository.save(score);
    }
}
