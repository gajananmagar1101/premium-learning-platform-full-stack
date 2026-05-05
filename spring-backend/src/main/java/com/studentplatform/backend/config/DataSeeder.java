package com.studentplatform.backend.config;

import com.studentplatform.backend.entity.AssignmentEntity;
import com.studentplatform.backend.entity.Role;
import com.studentplatform.backend.entity.SubjectEntity;
import com.studentplatform.backend.entity.SubmissionEntity;
import com.studentplatform.backend.entity.SubmissionStatus;
import com.studentplatform.backend.entity.UserEntity;
import com.studentplatform.backend.entity.YearEntity;
import com.studentplatform.backend.repository.AssignmentRepository;
import com.studentplatform.backend.repository.SubjectRepository;
import com.studentplatform.backend.repository.SubmissionRepository;
import com.studentplatform.backend.repository.UserRepository;
import com.studentplatform.backend.repository.YearRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final YearRepository yearRepository;
    private final SubjectRepository subjectRepository;
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
            SubmissionRepository submissionRepository,
            YearRepository yearRepository,
            SubjectRepository subjectRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.assignmentRepository = assignmentRepository;
        this.submissionRepository = submissionRepository;
        this.yearRepository = yearRepository;
        this.subjectRepository = subjectRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        seedAcademicCatalog();

        UserEntity admin = userRepository.findByEmail(adminEmail.toLowerCase().trim()).orElseGet(() -> {
            UserEntity user = new UserEntity();
            user.setName(adminName);
            user.setEmail(adminEmail);
            user.setPassword(passwordEncoder.encode(adminPassword));
            user.setRole(Role.ADMIN);
            user.setEmailVerified(true);
            user.prepareForSave();
            return userRepository.save(user);
        });

        if (!admin.isEmailVerified()) {
            admin.setEmailVerified(true);
            admin.setEmailVerificationTokenHash(null);
            admin.setEmailVerificationExpiresAt(null);
            admin.setEmailVerificationSentAt(null);
            userRepository.save(admin);
        }

        if (!seedDemoData || userRepository.countByRole(Role.STUDENT) > 0 || assignmentRepository.count() > 0) {
            return;
        }

        UserEntity alice = createStudent("Alice Johnson", "alice@studentplatform.local", "10");
        UserEntity bob = createStudent("Bob Martinez", "bob@studentplatform.local", "9");
        UserEntity carol = createStudent("Carol White", "carol@studentplatform.local", "11");

        AssignmentEntity essay = createAssignment(
                admin,
                "Industrial Revolution Essay",
                "Compiler Design",
                "BE",
                "Write a 600-word essay explaining how the Industrial Revolution changed daily life.",
                25,
                java.time.LocalDateTime.now().plusDays(5)
        );
        AssignmentEntity worksheet = createAssignment(
                admin,
                "Quadratic Equations Worksheet",
                "Data Structures",
                "SE",
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
        user.setEmailVerified(true);
        user.prepareForSave();
        return userRepository.save(user);
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
        SubjectEntity subjectEntity = subjectRepository.findByNormalizedName(subject.trim().toLowerCase())
                .orElseThrow(() -> new IllegalStateException("Seed subject not found: " + subject));
        assignment.setSubjectId(subjectEntity.getId());
        assignment.setLegacySubject(subjectEntity.getName());
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

    private void seedAcademicCatalog() {
        seedYear("FE", "FE", "First Year B.Tech");
        seedYear("SE", "SE", "Second Year B.Tech");
        seedYear("TE", "TE", "Third Year B.Tech");
        seedYear("BE", "BE", "Final Year B.Tech");

        seedSubject("Engineering Mathematics", "FE");
        seedSubject("Programming Fundamentals", "FE");
        seedSubject("Basic Electronics", "FE");
        seedSubject("Data Structures", "SE");
        seedSubject("Discrete Mathematics", "SE");
        seedSubject("Computer Organization", "SE");
        seedSubject("Database Management Systems", "TE");
        seedSubject("Operating Systems", "TE");
        seedSubject("Software Engineering", "TE");
        seedSubject("Machine Learning", "BE");
        seedSubject("Cloud Computing", "BE");
        seedSubject("Compiler Design", "BE");
    }

    private void seedYear(String id, String code, String name) {
        if (yearRepository.existsById(id)) {
            return;
        }
        yearRepository.save(new YearEntity(id, code, name));
    }

    private void seedSubject(String name, String yearId) {
        if (subjectRepository.findByNormalizedName(name.trim().toLowerCase()).isPresent()) {
            return;
        }
        SubjectEntity subject = new SubjectEntity();
        subject.setName(name);
        subject.setYearId(yearId);
        subject.prepareForSave();
        subjectRepository.save(subject);
    }
}
