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
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AiQuizService {

    private static final String LOCAL_SETUP_MESSAGE = "No cloud AI provider is configured. The built-in draft generator will be used until you add GEMINI_API_KEY or OPENAI_API_KEY in spring-backend/.env and restart the Spring backend.";
    private static final String AI_SYSTEM_PROMPT = """
            You generate clean academic multiple-choice quizzes.
            Return valid JSON only.
            Keep each question concise, classroom-ready, and aligned to the requested difficulty.
            Each question must have exactly 4 distinct options and one correctAnswer that matches one option exactly.
            """;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final AiProperties aiProperties;

    public AiQuizService(ObjectMapper objectMapper, AiProperties aiProperties) {
        this.restClient = RestClient.builder().build();
        this.objectMapper = objectMapper;
        this.aiProperties = aiProperties;
    }

    public List<AiQuizQuestionResponse> generateQuiz(AiQuizGenerateRequest request) {
        int questionCount = Math.min(request.questionCount(), aiProperties.getMaxQuestionCount());
        String provider = resolveProvider();
        return switch (provider) {
            case "gemini" -> generateWithGemini(request, questionCount);
            case "openai" -> generateWithOpenAi(request, questionCount);
            default -> generateFallbackQuiz(request, questionCount);
        };
    }

    private List<AiQuizQuestionResponse> generateWithOpenAi(AiQuizGenerateRequest request, int questionCount) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", aiProperties.getOpenaiModel());
        payload.put("messages", List.of(
                Map.of(
                        "role", "system",
                        "content", AI_SYSTEM_PROMPT
                ),
                Map.of(
                        "role", "user",
                        "content", buildPrompt(request.subject(), request.topic(), request.difficulty(), questionCount)
                )
        ));
        payload.put("response_format", buildResponseFormatSchema(questionCount));

        try {
            JsonNode responseBody = restClient.post()
                    .uri(aiProperties.getOpenaiBaseUrl() + "/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + aiProperties.getOpenaiApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(JsonNode.class);
            String content = responseBody.path("choices").path(0).path("message").path("content").asText(null);
            if (content == null || content.isBlank()) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "AI response was empty. Please try again.");
            }
            return parseQuizQuestions(content);
        } catch (RestClientResponseException error) {
            throw new ApiException(
                    HttpStatus.BAD_GATEWAY,
                    "AI quiz generation failed: " + safeErrorMessage(error.getResponseBodyAsString())
            );
        } catch (Exception error) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AI quiz generation failed. Please try again.");
        }
    }

    private List<AiQuizQuestionResponse> generateWithGemini(AiQuizGenerateRequest request, int questionCount) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("system_instruction", Map.of(
                "parts", List.of(Map.of("text", AI_SYSTEM_PROMPT))
        ));
        payload.put("contents", List.of(Map.of(
                "parts", List.of(Map.of("text", buildPrompt(request.subject(), request.topic(), request.difficulty(), questionCount)))
        )));
        payload.put("generationConfig", Map.of(
                "responseMimeType", "application/json",
                "responseJsonSchema", buildGeminiResponseSchema(questionCount)
        ));

        try {
            JsonNode responseBody = restClient.post()
                    .uri(aiProperties.getGeminiBaseUrl() + "/models/" + aiProperties.getGeminiModel() + ":generateContent")
                    .header("x-goog-api-key", aiProperties.getGeminiApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(JsonNode.class);
            String content = extractGeminiText(responseBody);
            if (content == null || content.isBlank()) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "AI response was empty. Please try again.");
            }
            return parseQuizQuestions(content);
        } catch (RestClientResponseException error) {
            throw new ApiException(
                    HttpStatus.BAD_GATEWAY,
                    "AI quiz generation failed: " + safeErrorMessage(error.getResponseBodyAsString())
            );
        } catch (ApiException error) {
            throw error;
        } catch (Exception error) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AI quiz generation failed. Please try again.");
        }
    }

    public AiQuizStatusResponse getStatus() {
        boolean enabled = aiProperties.isEnabled();
        boolean configured = isGeminiConfigured() || isOpenAiConfigured();
        boolean available = true;
        String provider = resolveProvider();

        String message;
        if (!enabled && !configured) {
            message = LOCAL_SETUP_MESSAGE;
        } else if ("gemini".equals(provider)) {
            message = "AI quiz generation is ready with Gemini.";
        } else if ("openai".equals(provider)) {
            message = "AI quiz generation is ready with OpenAI.";
        } else if (!enabled) {
            message = "AI draft generation is available with the built-in generator. Set AI_QUIZ_ENABLED=true and add GEMINI_API_KEY or OPENAI_API_KEY to use a cloud AI provider.";
        } else if ("gemini".equals(normalizeProviderPreference()) && !isGeminiConfigured()) {
            message = "GEMINI_API_KEY is missing. Add it to spring-backend/.env and restart the Spring backend, or set AI_PROVIDER=auto to use another configured provider.";
        } else if ("openai".equals(normalizeProviderPreference()) && !isOpenAiConfigured()) {
            message = "OPENAI_API_KEY is missing. Add it to spring-backend/.env and restart the Spring backend, or set AI_PROVIDER=auto to use another configured provider.";
        } else if (!enabled) {
            message = "AI draft generation is available with the built-in generator. Set AI_QUIZ_ENABLED=true and add GEMINI_API_KEY or OPENAI_API_KEY to use a cloud AI provider.";
        } else {
            message = "No cloud AI key is configured. Using the built-in draft generator until you add GEMINI_API_KEY or OPENAI_API_KEY to spring-backend/.env and restart the Spring backend.";
        }

        return new AiQuizStatusResponse(
                enabled,
                configured,
                available,
                aiProperties.getMaxQuestionCount(),
                message
        );
    }

    private boolean isOpenAiConfigured() {
        return aiProperties.getOpenaiApiKey() != null && !aiProperties.getOpenaiApiKey().isBlank();
    }

    private boolean isGeminiConfigured() {
        return aiProperties.getGeminiApiKey() != null && !aiProperties.getGeminiApiKey().isBlank();
    }

    private String normalizeProviderPreference() {
        String provider = normalizeText(aiProperties.getProvider()).toLowerCase(Locale.ROOT);
        return provider.isBlank() ? "auto" : provider;
    }

    private String resolveProvider() {
        if (!aiProperties.isEnabled()) {
            return "fallback";
        }

        return switch (normalizeProviderPreference()) {
            case "gemini" -> isGeminiConfigured() ? "gemini" : "fallback";
            case "openai" -> isOpenAiConfigured() ? "openai" : "fallback";
            case "fallback", "local" -> "fallback";
            case "auto" -> {
                if (isGeminiConfigured()) {
                    yield "gemini";
                }
                if (isOpenAiConfigured()) {
                    yield "openai";
                }
                yield "fallback";
            }
            default -> {
                if (isGeminiConfigured()) {
                    yield "gemini";
                }
                if (isOpenAiConfigured()) {
                    yield "openai";
                }
                yield "fallback";
            }
        };
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

    private Map<String, Object> buildGeminiResponseSchema(int questionCount) {
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
        return schema;
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

    private List<AiQuizQuestionResponse> parseQuizQuestions(String content) {
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
                boolean matchesOption = options.stream().anyMatch(option -> option.equalsIgnoreCase(correctAnswer));
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

    private String extractGeminiText(JsonNode responseBody) {
        JsonNode partsNode = responseBody.path("candidates").path(0).path("content").path("parts");
        if (!partsNode.isArray()) {
            return null;
        }
        StringBuilder builder = new StringBuilder();
        for (JsonNode partNode : partsNode) {
            String text = partNode.path("text").asText("");
            if (!text.isBlank()) {
                builder.append(text);
            }
        }
        String content = builder.toString().trim();
        return content.isBlank() ? null : content;
    }

    private List<AiQuizQuestionResponse> generateFallbackQuiz(AiQuizGenerateRequest request, int questionCount) {
        String subject = normalizeText(request.subject());
        String topic = normalizeText(request.topic());
        String difficulty = normalizeDifficulty(request.difficulty());

        List<AiQuizQuestionResponse> questions = new ArrayList<>();
        for (int index = 0; index < questionCount; index += 1) {
            questions.add(buildFallbackQuestion(index + 1, subject, topic, difficulty));
        }
        return questions;
    }

    private AiQuizQuestionResponse buildFallbackQuestion(int index, String subject, String topic, String difficulty) {
        return switch ((index - 1) % 8) {
            case 0 -> createQuestion(
                    index,
                    "Which statement best describes the main idea of " + topic + " in " + subject + "?",
                    List.of(
                            "It focuses on the core concept and its standard classroom applications.",
                            "It is limited to memorizing formulas without understanding.",
                            "It avoids practical problem solving altogether.",
                            "It only applies when " + subject + " is replaced by a different subject."
                    ),
                    0
            );
            case 1 -> createQuestion(
                    index,
                    "Which learning goal is most appropriate when studying " + topic + " at a " + difficulty + " level?",
                    List.of(
                            "Identify ideas without solving any examples.",
                            "Explain the concept, apply it, and justify the chosen method.",
                            "Ignore definitions and focus only on final answers.",
                            "Memorize one example and use it for every problem."
                    ),
                    1
            );
            case 2 -> createQuestion(
                    index,
                    "A student is revising " + topic + ". Which step should usually come first?",
                    List.of(
                            "Jump straight to advanced edge cases with no basics.",
                            "Read unrelated chapters from another unit only.",
                            "Review the definition, structure, and a simple worked example.",
                            "Skip examples and start with the longest derivation available."
                    ),
                    2
            );
            case 3 -> createQuestion(
                    index,
                    "Which option is the best indicator that a learner understands " + topic + "?",
                    List.of(
                            "They can explain why a method works and when to use it.",
                            "They repeat terminology but cannot solve any question.",
                            "They avoid checking whether the answer is reasonable.",
                            "They always choose the longest option without analysis."
                    ),
                    0
            );
            case 4 -> createQuestion(
                    index,
                    "Which mistake is most important to avoid while answering questions on " + topic + "?",
                    List.of(
                            "Connecting the concept to the question being asked.",
                            "Checking assumptions before selecting an answer.",
                            "Using topic-specific reasoning to compare options.",
                            "Choosing an answer before interpreting the key concept correctly."
                    ),
                    3
            );
            case 5 -> createQuestion(
                    index,
                    "Why is " + topic + " important in " + subject + "?",
                    List.of(
                            "It helps learners connect theory with common problem-solving patterns.",
                            "It removes the need to understand the rest of the subject.",
                            "It guarantees every question will have the same structure.",
                            "It is useful only for trick questions."
                    ),
                    0
            );
            case 6 -> createQuestion(
                    index,
                    "Which revision strategy is most effective for " + topic + "?",
                    List.of(
                            "Practice mixed questions and review why each correct answer is valid.",
                            "Read the title once and move to a new chapter.",
                            "Memorize distractor options instead of the concept.",
                            "Avoid solving questions under any time limit."
                    ),
                    0
            );
            default -> createQuestion(
                    index,
                    "Which classroom scenario best shows correct use of " + topic + "?",
                    List.of(
                            "A learner applies the concept to a relevant problem and explains the result clearly.",
                            "A learner copies an answer without relating it to the question.",
                            "A learner selects an option only because it looks technical.",
                            "A learner ignores the given conditions and answers from memory."
                    ),
                    0
            );
        };
    }

    private AiQuizQuestionResponse createQuestion(int id, String prompt, List<String> options, int correctOptionIndex) {
        List<String> normalizedOptions = options.stream()
                .map(this::normalizeText)
                .toList();
        return new AiQuizQuestionResponse(
                id,
                normalizeText(prompt),
                Collections.unmodifiableList(normalizedOptions),
                normalizedOptions.get(correctOptionIndex)
        );
    }

    private String normalizeDifficulty(String difficulty) {
        String normalized = normalizeText(difficulty).toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return "medium";
        }
        return switch (normalized) {
            case "easy", "medium", "hard" -> normalized;
            default -> "medium";
        };
    }

    private String safeErrorMessage(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String message = root.path("error").path("message").asText();
            if (message == null || message.isBlank()) {
                message = root.path("message").asText();
            }
            return message == null || message.isBlank() ? "Upstream AI request failed." : message;
        } catch (Exception ignored) {
            return "Upstream AI request failed.";
        }
    }
}
