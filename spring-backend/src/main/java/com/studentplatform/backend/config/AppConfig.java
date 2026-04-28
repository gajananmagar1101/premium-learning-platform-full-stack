package com.studentplatform.backend.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({ CorsProperties.class, AiProperties.class })
public class AppConfig {
}
