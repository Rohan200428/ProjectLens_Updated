package com.mfrp.plens.service;

import com.mfrp.plens.dto.ApiDtos.*;
import com.mfrp.plens.model.*;
import com.mfrp.plens.repository.*;

import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class SubmissionMapper {
    private final SubmissionEvaluationRepository evaluations;
    private final TrainerDecisionRepository decisions;

    public SubmissionMapper(
            SubmissionEvaluationRepository evaluations, TrainerDecisionRepository decisions) {
        this.evaluations = evaluations;
        this.decisions = decisions;
    }

    public ProjectSubmissionResponse response(ProjectSubmission s) {
        var e = evaluations.findBySubmissionId(s.getId()).orElseThrow();
        var result =
                new SubmissionEvaluationResponse(
                        e.getAlignmentScore(),
                        matches(e.getMatchedCriteria(), s),
                        matches(e.getMissingCriteria(), s),
                        e.getOverlapDetails(),
                        e.getSimilarSubmissionId(),
                        e.getSimilarity(),
                        List.copyOf(e.getSharedTerms()),
                        e.getEvaluatedAt(),
                        e.getExplanation() == null
                                ? ProjectEvaluationEngine.RULE_EXPLANATION
                                : e.getExplanation(),
                        e.getSource());
        return new ProjectSubmissionResponse(
                s.getId(),
                s.getVersion(),
                s.getProjectTitle(),
                s.getProblemStatement(),
                s.getObjectives(),
                s.getTechnologies().stream()
                        .map(t -> new TechnologySelection(t.getName(), t.getCategory()))
                        .toList(),
                s.getDocumentationLink(),
                s.getSubmissionDate(),
                s.getAlignmentScore(),
                s.getOverlapLevel(),
                s.isOverlapFlag(),
                s.getStatus(),
                s.getPod().getId(),
                s.getPod().getName(),
                s.getSubmittedBy().getName(),
                result,
                decisions.findBySubmissionIdOrderByDecidedAtDesc(s.getId()).stream()
                        .map(this::decision)
                        .toList(),
                s.getUpdatedAt());
    }

    private List<CriterionMatch> matches(Set<CohortCriteria> criteria, ProjectSubmission s) {
        return criteria.stream()
                .sorted(Comparator.comparing(CohortCriteria::getId))
                .map(
                        c ->
                                new CriterionMatch(
                                        c.getId(),
                                        c.getTitle(),
                                        c.getDescription(),
                                        List.copyOf(c.getKeywords()),
                                        c.getKeywords().stream()
                                                .filter(
                                                        k ->
                                                                TextAnalysis.containsPhrase(
                                                                        TextAnalysis.text(s), k))
                                                .toList()))
                .toList();
    }

    public TrainerDecisionResponse decision(TrainerDecision d) {
        return new TrainerDecisionResponse(
                d.getId(),
                d.getDecision(),
                d.getComments(),
                d.getDecidedBy().getName(),
                d.getDecidedAt());
    }
}
