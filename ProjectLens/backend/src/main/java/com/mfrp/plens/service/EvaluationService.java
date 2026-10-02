package com.mfrp.plens.service;

import com.mfrp.plens.config.ProjectLensProperties;
import com.mfrp.plens.model.*;
import com.mfrp.plens.repository.*;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class EvaluationService {
    private final ProjectEvaluationEngine engine;
    private final CohortCriteriaRepository criteria;
    private final ProjectSubmissionRepository submissions;
    private final SubmissionEvaluationRepository evaluations;
    private final OverlapDetectionService overlap;
    private final ProjectLensProperties properties;

    public EvaluationService(
            ProjectEvaluationEngine engine,
            CohortCriteriaRepository criteria,
            ProjectSubmissionRepository submissions,
            SubmissionEvaluationRepository evaluations,
            OverlapDetectionService overlap,
            ProjectLensProperties properties) {
        this.engine = engine;
        this.criteria = criteria;
        this.submissions = submissions;
        this.evaluations = evaluations;
        this.overlap = overlap;
        this.properties = properties;
    }

    public void evaluate(ProjectSubmission s) {
        var result =
                engine.evaluate(
                        ProjectEvaluationEngine.Input.from(s),
                        criteria.findByActiveTrueOrderByIdAsc());
        var similarity = overlap.detect(s, submissions.findAll());
        var evaluation =
                evaluations.findBySubmissionId(s.getId()).orElseGet(SubmissionEvaluation::new);
        evaluation.setSubmission(s);
        evaluation.setAlignmentScore(result.score());
        evaluation.setSource(result.source());
        evaluation.setExplanation(result.explanation());
        evaluation.setMatchedCriteria(new LinkedHashSet<>(result.matched()));
        evaluation.setMissingCriteria(new LinkedHashSet<>(result.missing()));
        evaluation.setOverlapDetails(similarity.details());
        evaluation.setSimilarSubmissionId(similarity.similarId());
        evaluation.setSimilarity(similarity.similarity());
        evaluation.setSharedTerms(new ArrayList<>(similarity.sharedTerms()));
        evaluation.setEvaluatedAt(Instant.now());
        evaluations.save(evaluation);
        s.setAlignmentScore(result.score());
        s.setOverlapLevel(similarity.level());
        s.setOverlapFlag(similarity.flag());
        s.setStatus(
                result.score() >= properties.getReviewThreshold()
                        ? SubmissionStatus.PENDING_REVIEW
                        : SubmissionStatus.NEEDS_IMPROVEMENT);
        submissions.saveAndFlush(s);
    }
}
