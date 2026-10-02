package com.mfrp.plens.dto;

import com.mfrp.plens.model.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.Instant;
import java.util.List;

public final class ApiDtos {
    private ApiDtos() {}

    public record LoginRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 200) String password) {}

    public record UserResponse(
            Long id, String name, String email, Role role, Long podId, String podName) {}

    public record LoginResponse(String token, Instant expiresAt, UserResponse user) {}

    public record ProjectSubmissionRequest(
            @NotBlank @Size(min = 3, max = 150) String projectTitle,
            @NotBlank @Size(min = 10, max = 1000) String problemStatement,
            @NotBlank @Size(min = 10, max = 1000) String objectives,
            @NotEmpty @Size(max = 40) List<@NotNull @Valid TechnologySelection> technologyStack,
            @NotBlank
                    @Size(max = 2048)
                    @Pattern(
                            regexp = "(?i)^https?://[^\\s]+$",
                            message = "Documentation link must be a valid HTTP or HTTPS URL")
                    String documentationLink,
            Long version) {}

    public record TechnologySelection(
            @NotBlank @Size(max = 60) String name, @NotNull TechnologyCategory category) {}

    public record TrainerDecisionRequest(
            @NotNull Decision decision,
            @NotBlank @Size(max = 3000) String comments,
            @NotNull Long version) {}

    public record CohortCriteriaResponse(
            Long id,
            String title,
            String description,
            String learningObjective,
            List<String> keywords,
            boolean active) {}

    public record CriterionMatch(
            Long id,
            String title,
            String description,
            List<String> keywords,
            List<String> matchedKeywords) {}

    public record SubmissionEvaluationResponse(
            double alignmentScore,
            List<CriterionMatch> matchedCriteria,
            List<CriterionMatch> missingCriteria,
            String overlapDetails,
            Long similarSubmissionId,
            double similarity,
            List<String> sharedTerms,
            Instant evaluatedAt,
            String scoringExplanation,
            EvaluationSource source) {}

    public record TrainerDecisionResponse(
            Long id, Decision decision, String comments, String trainerName, Instant decidedAt) {}

    public record ProjectSubmissionResponse(
            Long id,
            Long version,
            String projectTitle,
            String problemStatement,
            String objectives,
            List<TechnologySelection> technologyStack,
            String documentationLink,
            Instant submissionDate,
            double alignmentScore,
            OverlapLevel overlapLevel,
            boolean overlapFlag,
            SubmissionStatus status,
            Long podId,
            String podName,
            String submittedBy,
            SubmissionEvaluationResponse evaluation,
            List<TrainerDecisionResponse> decisions,
            Instant updatedAt) {}

    public record DashboardStatsResponse(
            long totalSubmissions,
            double averageAlignmentScore,
            long overlapFlags,
            long pendingReview,
            long approved,
            long needsRevision,
            long rejected,
            double reviewThreshold) {}

    public record DashboardResponse(
            DashboardStatsResponse stats, List<ProjectSubmissionResponse> submissions) {}

    public record NotificationResponse(
            Long id,
            String title,
            String message,
            Long submissionId,
            boolean read,
            Instant createdAt) {}

    public record CriteriaResponse(
            String theme,
            double reviewThreshold,
            double overlapMedium,
            double overlapHigh,
            List<CohortCriteriaResponse> criteria) {}

    public record ErrorResponse(
            Instant timestamp,
            int status,
            String message,
            String path,
            java.util.Map<String, String> errors) {}
}
