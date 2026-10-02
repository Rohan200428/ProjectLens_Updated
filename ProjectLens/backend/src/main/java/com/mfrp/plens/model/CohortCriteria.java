package com.mfrp.plens.model;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "cohort_criteria")
public class CohortCriteria extends BaseEntity {
    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, length = 1000)
    private String description;

    @Column(nullable = false, length = 1000)
    private String learningObjective;

    @ElementCollection
    @CollectionTable(name = "criteria_keywords", joinColumns = @JoinColumn(name = "criterion_id"))
    @Column(nullable = false, length = 100)
    private java.util.List<String> keywords = new java.util.ArrayList<>();

    @Column(nullable = false)
    private boolean active = true;
}
