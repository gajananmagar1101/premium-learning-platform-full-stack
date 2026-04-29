package com.studentplatform.backend.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Document(collection = "quizzes")
public class QuizEntity {

    @Id
    private String id;

    private String title;
    private String subjectId;
    private String legacySubject;
    private String className;
    private String description = "";
    private Instant deadlineAt;
    private Integer durationMinutes;
    private String status = "draft";
    private List<QuizQuestion> questions = new ArrayList<>();
    private Integer totalPoints = 0;
    private Instant createdAt;
    private Instant updatedAt;

    public void prepareForSave() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
        if (description == null) {
            description = "";
        }
        if (status == null || status.isBlank()) {
            status = "draft";
        }
        if (questions == null) {
            questions = new ArrayList<>();
        }
        for (QuizQuestion question : questions) {
            question.prepareForSave();
        }
        totalPoints = questions.stream()
                .mapToInt(question -> question.getPoints() == null ? 0 : question.getPoints())
                .sum();
    }

    public String getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSubjectId() {
        return subjectId;
    }

    public void setSubjectId(String subjectId) {
        this.subjectId = subjectId;
    }

    public String getLegacySubject() {
        return legacySubject;
    }

    public void setLegacySubject(String legacySubject) {
        this.legacySubject = legacySubject;
    }

    public String getClassName() {
        return className;
    }

    public void setClassName(String className) {
        this.className = className;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Instant getDeadlineAt() {
        return deadlineAt;
    }

    public void setDeadlineAt(Instant deadlineAt) {
        this.deadlineAt = deadlineAt;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<QuizQuestion> getQuestions() {
        return questions;
    }

    public void setQuestions(List<QuizQuestion> questions) {
        this.questions = questions;
    }

    public Integer getTotalPoints() {
        return totalPoints;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public static class QuizQuestion {
        private String id;
        private String prompt;
        private List<String> options = new ArrayList<>();
        private Integer correctOption;
        private Integer points = 1;

        void prepareForSave() {
            if (id == null || id.isBlank()) {
                id = UUID.randomUUID().toString();
            }
            if (prompt == null) {
                prompt = "";
            }
            if (options == null) {
                options = new ArrayList<>();
            }
            if (correctOption == null) {
                correctOption = 0;
            }
            if (points == null || points < 1) {
                points = 1;
            }
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getPrompt() {
            return prompt;
        }

        public void setPrompt(String prompt) {
            this.prompt = prompt;
        }

        public List<String> getOptions() {
            return options;
        }

        public void setOptions(List<String> options) {
            this.options = options;
        }

        public Integer getCorrectOption() {
            return correctOption;
        }

        public void setCorrectOption(Integer correctOption) {
            this.correctOption = correctOption;
        }

        public Integer getPoints() {
            return points;
        }

        public void setPoints(Integer points) {
            this.points = points;
        }
    }
}
