package com.studentplatform.backend.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.IndexInfo;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

@Component
public class MongoIndexConfig {

    private static final Logger log = LoggerFactory.getLogger(MongoIndexConfig.class);

    private final MongoTemplate mongoTemplate;

    public MongoIndexConfig(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @PostConstruct
    public void ensureIndexes() {
        try {
            removeInheritedEmailIndexes();
        } catch (Exception e) {
            log.warn("Could not manage indexes at startup (database may be unavailable): {}", e.getMessage());
        }
    }

    private void removeInheritedEmailIndexes() {
        List<String> collections = List.of(
                "assignments",
                "submissions",
                "quiz_attempts",
                "quiz_sessions"
        );

        for (String collection : collections) {
            List<IndexInfo> indexes = mongoTemplate.indexOps(collection).getIndexInfo();
            for (IndexInfo index : indexes) {
                String name = index.getName();
                boolean emailIndex = index.getIndexFields().stream()
                        .map((field) -> field.getKey())
                        .filter(Objects::nonNull)
                        .anyMatch((key) -> key.endsWith(".email") || key.equals("email"));

                if (emailIndex && name != null && !name.equals("_id_")) {
                    mongoTemplate.indexOps(collection).dropIndex(name);
                }
            }
        }
    }
}
