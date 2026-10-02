package com.mfrp.plens.model;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "submission_evaluations")
public class SubmissionEvaluation extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submission_id", nullable = false, unique = true)
    private ProjectSubmission submission;

    @Column(nullable = false)
    private double alignmentScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, columnDefinition = "varchar(20) default 'RULE_BASED'")
    private EvaluationSource source = EvaluationSource.RULE_BASED;

    @Column(length = 6000)
    private String explanation;

    @ManyToMany
    @JoinTable(
            name = "evaluation_matched",
            joinColumns = @JoinColumn(name = "evaluation_id"),
            inverseJoinColumns = @JoinColumn(name = "criterion_id"))
    private java.util.Set<CohortCriteria> matchedCriteria = new java.util.LinkedHashSet<>();

    @ManyToMany
    @JoinTable(
            name = "evaluation_missing",
            joinColumns = @JoinColumn(name = "evaluation_id"),
            inverseJoinColumns = @JoinColumn(name = "criterion_id"))
    private java.util.Set<CohortCriteria> missingCriteria = new java.util.LinkedHashSet<>();

    @Column(nullable = false, length = 2000)
    private String overlapDetails;

    private Long similarSubmissionId;
    private double similarity;

    @ElementCollection
    @CollectionTable(
            name = "evaluation_shared_terms",
            joinColumns = @JoinColumn(name = "evaluation_id"))
    @Column(length = 100)
    private java.util.List<String> sharedTerms = new java.util.ArrayList<>();

    @Column(nullable = false)
    private java.time.Instant evaluatedAt;
}
