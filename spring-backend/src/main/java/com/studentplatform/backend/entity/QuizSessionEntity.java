package com.studentplatform.backend.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "quiz_sessions")
@CompoundIndexes({
        @CompoundIndex(name = "quiz_session_student_unique", def = "{'quizId': 1, 'studentId': 1}", unique = true)
})
public class QuizSessionEntity {

    @Id
    private String id;

    private String quizId;
    private String studentId;
    private String studentName;
    private String studentEmail;
    private String className;
    private List<Integer> answers = new ArrayList<>();
    private Integer currentQuestionIndex = 0;
    private Instant startedAt;

    @Indexed
    private Instant endsAt;

    private Instant updatedAt;

    public void prepareForSave() {
        Instant now = Instant.now();
        if (startedAt == null) {
            startedAt = now;
        }
        updatedAt = now;
        if (answers == null) {
            answers = new ArrayList<>();
        }
        if (currentQuestionIndex == null) {
            currentQuestionIndex = 0;
        }
    }

    public String getId() {
        return id;
    }

    public String getQuizId() {
        return quizId;
    }

    public void setQuizId(String quizId) {
        this.quizId = quizId;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getStudentName() {
        return studentName;
    }

    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    public String getStudentEmail() {
        return studentEmail;
    }

    public void setStudentEmail(String studentEmail) {
        this.studentEmail = studentEmail;
    }

    public String getClassName() {
        return className;
    }

    public void setClassName(String className) {
        this.className = className;
    }

    public List<Integer> getAnswers() {
        return answers;
    }

    public void setAnswers(List<Integer> answers) {
        this.answers = answers;
    }

    public Integer getCurrentQuestionIndex() {
        return currentQuestionIndex;
    }

    public void setCurrentQuestionIndex(Integer currentQuestionIndex) {
        this.currentQuestionIndex = currentQuestionIndex;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public void setEndsAt(Instant endsAt) {
        this.endsAt = endsAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
