package com.studentplatform.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studentplatform.backend.config.AiProperties;
import com.studentplatform.backend.dto.AiQuizGenerateRequest;
import com.studentplatform.backend.dto.AiQuizQuestionResponse;
import com.studentplatform.backend.dto.AiQuizStatusResponse;
import com.studentplatform.backend.exception.ApiException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AiQuizService {

    private static final String LOCAL_SETUP_MESSAGE = "AI quiz generation is not configured. Create spring-backend/.env with AI_QUIZ_ENABLED=true and a valid OPENAI_API_KEY, then restart the Spring backend.";

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final AiProperties aiProperties;

    public AiQuizService(ObjectMapper objectMapper, AiProperties aiProperties) {
        this.restClient = RestClient.builder().build();
        this.objectMapper = objectMapper;
        this.aiProperties = aiProperties;
    }

    public List<AiQuizQuestionResponse> generateQuiz(AiQuizGenerateRequest request) {
        validateConfiguration();
        int questionCount = Math.min(request.questionCount(), aiProperties.getMaxQuestionCount());

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", aiProperties.getOpenaiModel());
        payload.put("messages", List.of(
                Map.of(
                        "role", "system",
                        "content", """
                                You generate clean academic multiple-choice quizzes.
                                Return valid JSON only.
                                Keep each question concise, classroom-ready, and aligned to the requested difficulty.
                                Each question must have exactly 4 distinct options and one correctAnswer that matches one option exactly.
                                """
                ),
                Map.of(
                        "role", "user",
                        "content", buildPrompt(request.subject(), request.topic(), request.difficulty(), questionCount)
                )
        ));
        payload.put("response_format", buildResponseFormatSchema(questionCount));

        JsonNode responseBody;
        try {
            responseBody = restClient.post()
                    .uri(aiProperties.getOpenaiBaseUrl() + "/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + aiProperties.getOpenaiApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientResponseException error) {
            throw new ApiException(
                    HttpStatus.BAD_GATEWAY,
                    "AI quiz generation failed: " + safeErrorMessage(error.getResponseBodyAsString())
            );
        } catch (Exception error) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AI quiz generation failed. Please try again.");
        }

        String content = responseBody.path("choices").path(0).path("message").path("content").asText(null);
        if (content == null || content.isBlank()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AI response was empty. Please try again.");
        }

        try {
            JsonNode root = objectMapper.readTree(content);
            JsonNode questionsNode = root.path("questions");
            if (!questionsNode.isArray() || questionsNode.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "AI did not return any quiz questions.");
            }

            List<AiQuizQuestionResponse> questions = new ArrayList<>();
            int index = 1;
            for (JsonNode item : questionsNode) {
                String question = normalizeText(item.path("question").asText());
                if (question.isBlank()) {
                    throw new ApiException(HttpStatus.BAD_GATEWAY, "AI returned a question without text.");
                }

                JsonNode optionsNode = item.path("options");
                if (!optionsNode.isArray() || optionsNode.size() != 4) {
                    throw new ApiException(HttpStatus.BAD_GATEWAY, "AI returned a question without exactly 4 options.");
                }

                List<String> options = new ArrayList<>();
                for (JsonNode optionNode : optionsNode) {
                    String option = normalizeText(optionNode.asText());
                    if (option.isBlank()) {
                        throw new ApiException(HttpStatus.BAD_GATEWAY, "AI returned an empty option.");
                    }
                    options.add(option);
                }

                String correctAnswer = normalizeText(item.path("correctAnswer").asText());
                boolean matchesOption = options.stream()
                        .anyMatch(option -> option.equalsIgnoreCase(correctAnswer));
                if (!matchesOption) {
                    throw new ApiException(HttpStatus.BAD_GATEWAY, "AI returned a correct answer that does not match the options.");
                }

                String exactCorrectAnswer = options.stream()
                        .filter(option -> option.equalsIgnoreCase(correctAnswer))
                        .findFirst()
                        .orElse(correctAnswer);

                questions.add(new AiQuizQuestionResponse(index++, question, options, exactCorrectAnswer));
            }
            return questions;
        } catch (JsonProcessingException error) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AI returned invalid JSON. Please try again.");
        }
    }

    public AiQuizStatusResponse getStatus() {
        boolean enabled = aiProperties.isEnabled();
        boolean configured = aiProperties.getOpenaiApiKey() != null && !aiProperties.getOpenaiApiKey().isBlank();
        boolean available = enabled && configured;

        String message;
        if (available) {
            message = "AI quiz generation is ready.";
        } else if (!enabled && !configured) {
            message = LOCAL_SETUP_MESSAGE;
        } else if (!enabled) {
            message = "AI quiz generation is disabled. Set AI_QUIZ_ENABLED=true and restart the Spring backend.";
        } else {
            message = "OPENAI_API_KEY is missing. Add it to spring-backend/.env and restart the Spring backend.";
        }

        return new AiQuizStatusResponse(
                enabled,
                configured,
                available,
                aiProperties.getMaxQuestionCount(),
                message
        );
    }

    private void validateConfiguration() {
        if (!aiProperties.isEnabled()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, getStatus().message());
        }
        if (aiProperties.getOpenaiApiKey() == null || aiProperties.getOpenaiApiKey().isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, getStatus().message());
        }
    }

    private Map<String, Object> buildResponseFormatSchema(int questionCount) {
        Map<String, Object> questionSchema = new LinkedHashMap<>();
        questionSchema.put("type", "object");
        questionSchema.put("properties", Map.of(
                "question", Map.of("type", "string"),
                "options", Map.of(
                        "type", "array",
                        "minItems", 4,
                        "maxItems", 4,
                        "items", Map.of("type", "string")
                ),
                "correctAnswer", Map.of("type", "string")
        ));
        questionSchema.put("required", List.of("question", "options", "correctAnswer"));
        questionSchema.put("additionalProperties", false);

        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", Map.of(
                "questions", Map.of(
                        "type", "array",
                        "minItems", questionCount,
                        "maxItems", questionCount,
                        "items", questionSchema
                )
        ));
        schema.put("required", List.of("questions"));
        schema.put("additionalProperties", false);

        return Map.of(
                "type", "json_schema",
                "json_schema", Map.of(
                        "name", "generated_quiz_questions",
                        "strict", true,
                        "schema", schema
                )
        );
    }

    private String buildPrompt(String subject, String topic, String difficulty, int questionCount) {
        return String.format(
                Locale.ROOT,
                """
                        Generate %d multiple-choice quiz questions in JSON.
                        Subject: %s
                        Topic: %s
                        Difficulty: %s

                        Requirements:
                        - exactly 4 options per question
                        - one correctAnswer matching one option exactly
                        - concise, classroom-ready wording
                        - avoid duplicate questions
                        - no markdown, no explanation, only JSON
                        """,
                questionCount,
                subject.trim(),
                topic.trim(),
                difficulty.trim()
        );
    }

    private String normalizeText(String value) {
        return value == null ? "" : value.trim();
    }

    private String safeErrorMessage(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String message = root.path("error").path("message").asText();
            return message == null || message.isBlank() ? "Upstream AI request failed." : message;
        } catch (Exception ignored) {
            return "Upstream AI request failed.";
        }
    }
}
