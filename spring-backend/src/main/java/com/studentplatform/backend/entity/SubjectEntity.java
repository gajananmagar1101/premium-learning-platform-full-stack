package com.studentplatform.backend.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "subjects")
public class SubjectEntity {

    @Id
    private String id;

    @Indexed(unique = true, useGeneratedName = true)
    private String normalizedName;

    private String name;

    private String yearId;

    public void prepareForSave() {
        if (name != null) {
            name = name.trim();
        }
        if (yearId != null) {
            yearId = yearId.trim();
        }
        normalizedName = name == null ? null : name.trim().toLowerCase();
    }

    public String getId() {
        return id;
    }

    public String getNormalizedName() {
        return normalizedName;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getYearId() {
        return yearId;
    }

    public void setYearId(String yearId) {
        this.yearId = yearId;
    }
}
