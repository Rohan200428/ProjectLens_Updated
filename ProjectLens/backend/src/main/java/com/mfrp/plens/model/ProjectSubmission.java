package com.mfrp.plens.model;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "project_submissions")
public class ProjectSubmission extends BaseEntity {
    @Version private Long version;

    @Column(nullable = false, length = 150)
    private String projectTitle;

    @Column(nullable = false, length = 5000)
    private String problemStatement;

    @Column(nullable = false, length = 5000)
    private String objectives;

    // Retained only to migrate older installations; API uses the structured collection.
    @Column(nullable = false, length = 2000)
    private String technologyStack;

    @ElementCollection
    @CollectionTable(
            name = "submission_technologies",
            joinColumns = @JoinColumn(name = "submission_id"))
    @OrderColumn(name = "selection_order")
    private java.util.List<Technology> technologies = new java.util.ArrayList<>();

    @Column(nullable = false, length = 2048)
    private String documentationLink;

    @Column(nullable = false)
    private java.time.Instant submissionDate;

    @Column(nullable = false)
    private double alignmentScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OverlapLevel overlapLevel = OverlapLevel.LOW;

    @Column(nullable = false)
    private boolean overlapFlag;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private SubmissionStatus status;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pod_id", nullable = false, unique = true)
    private Pod pod;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submitted_by", nullable = false)
    private User submittedBy;
}
