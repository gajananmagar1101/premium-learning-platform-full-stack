package com.studentplatform.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.ai")
public class AiProperties {

    private boolean enabled = false;
    private String provider = "auto";
    private String openaiApiKey;
    private String openaiModel = "gpt-4o-mini";
    private String openaiBaseUrl = "https://api.openai.com/v1";
    private String geminiApiKey;
    private String geminiModel = "gemini-2.5-flash-lite";
    private String geminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta";
    private Integer maxQuestionCount = 15;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getOpenaiApiKey() {
        return openaiApiKey;
    }

    public void setOpenaiApiKey(String openaiApiKey) {
        this.openaiApiKey = openaiApiKey;
    }

    public String getOpenaiModel() {
        return openaiModel;
    }

    public void setOpenaiModel(String openaiModel) {
        this.openaiModel = openaiModel;
    }

    public String getOpenaiBaseUrl() {
        return openaiBaseUrl;
    }

    public void setOpenaiBaseUrl(String openaiBaseUrl) {
        this.openaiBaseUrl = openaiBaseUrl;
    }

    public String getGeminiApiKey() {
        return geminiApiKey;
    }

    public void setGeminiApiKey(String geminiApiKey) {
        this.geminiApiKey = geminiApiKey;
    }

    public String getGeminiModel() {
        return geminiModel;
    }

    public void setGeminiModel(String geminiModel) {
        this.geminiModel = geminiModel;
    }

    public String getGeminiBaseUrl() {
        return geminiBaseUrl;
    }

    public void setGeminiBaseUrl(String geminiBaseUrl) {
        this.geminiBaseUrl = geminiBaseUrl;
    }

    public Integer getMaxQuestionCount() {
        return maxQuestionCount;
    }

    public void setMaxQuestionCount(Integer maxQuestionCount) {
        this.maxQuestionCount = maxQuestionCount;
    }
}
