package com.mfrp.plens.service;

import com.mfrp.plens.config.ProjectLensProperties;
import com.mfrp.plens.dto.ApiDtos.*;
import com.mfrp.plens.exception.ApiException;
import com.mfrp.plens.model.*;
import com.mfrp.plens.repository.*;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@Transactional
public class SubmissionService {
    private final ProjectSubmissionRepository submissions;
    private final PodRepository pods;
    private final UserService users;
    private final EvaluationService evaluator;
    private final NotificationService notifications;
    private final SubmissionMapper mapper;
    private final ProjectLensProperties properties;
    private final TechnologyCatalog technologies;

    public SubmissionService(
            ProjectSubmissionRepository submissions,
            PodRepository pods,
            UserService users,
            EvaluationService evaluator,
            NotificationService notifications,
            SubmissionMapper mapper,
            ProjectLensProperties properties,
            TechnologyCatalog technologies) {
        this.submissions = submissions;
        this.pods = pods;
        this.users = users;
        this.evaluator = evaluator;
        this.notifications = notifications;
        this.mapper = mapper;
        this.properties = properties;
        this.technologies = technologies;
    }

    public ProjectSubmissionResponse create(ProjectSubmissionRequest request) {
        User user = lead();
        Pod pod = pods.lockById(user.getPod().getId()).orElseThrow();
        if (submissions.findByPodId(pod.getId()).isPresent())
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "Your pod already has an idea for this theme. Revise the existing submission"
                            + " instead.");
        ProjectSubmission s = new ProjectSubmission();
        s.setPod(pod);
        s.setSubmittedBy(user);
        apply(s, request);
        s.setStatus(SubmissionStatus.ANALYZING);
        submissions.saveAndFlush(s);
        evaluator.evaluate(s);
        notifyEvaluation(s);
        return mapper.response(s);
    }

    public ProjectSubmissionResponse revise(Long id, ProjectSubmissionRequest request) {
        User user = lead();
        var s =
                submissions
                        .lockById(id)
                        .orElseThrow(
                                () ->
                                        new ApiException(
                                                HttpStatus.NOT_FOUND, "Submission not found."));
        authorizePod(s, user);
        if (!Set.of(
                        SubmissionStatus.NEEDS_IMPROVEMENT,
                        SubmissionStatus.NEEDS_REVISION,
                        SubmissionStatus.REJECTED)
                .contains(s.getStatus()))
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "Only ideas needing improvement, revision, or reconsideration can be"
                            + " resubmitted.");
        if (request.version() == null || !request.version().equals(s.getVersion()))
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "The submission has changed. Refresh before resubmitting.");
        apply(s, request);
        s.setStatus(SubmissionStatus.ANALYZING);
        evaluator.evaluate(s);
        notifyEvaluation(s);
        return mapper.response(s);
    }

    @Transactional(readOnly = true)
    public List<ProjectSubmissionResponse> mine() {
        User user = users.current();
        if (user.getRole() == Role.TRAINER || user.getPod() == null)
            throw new ApiException(HttpStatus.FORBIDDEN, "Pod access is required.");
        return submissions.findByPodId(user.getPod().getId()).stream()
                .map(mapper::response)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectSubmissionResponse get(Long id) {
        var s =
                submissions
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        new ApiException(
                                                HttpStatus.NOT_FOUND, "Submission not found."));
        User user = users.current();
        if (user.getRole() == Role.TRAINER) {
            if (s.getAlignmentScore() < properties.getReviewThreshold())
                throw new ApiException(HttpStatus.NOT_FOUND, "Submission not found.");
        } else authorizePod(s, user);
        return mapper.response(s);
    }

    private User lead() {
        User user = users.current();
        if (user.getRole() != Role.POD_LEAD || user.getPod() == null)
            throw new ApiException(
                    HttpStatus.FORBIDDEN, "Only Pod Leads can submit or revise ideas.");
        return user;
    }

    private void authorizePod(ProjectSubmission s, User user) {
        if (user.getPod() == null || !s.getPod().getId().equals(user.getPod().getId()))
            throw new ApiException(
                    HttpStatus.FORBIDDEN, "You can only view your own pod's submission.");
    }

    private void apply(ProjectSubmission s, ProjectSubmissionRequest r) {
        s.setProjectTitle(r.projectTitle().trim());
        s.setProblemStatement(r.problemStatement().trim());
        s.setObjectives(r.objectives().trim());
        s.setTechnologies(technologies.validate(r.technologyStack()));
        s.setTechnologyStack(
                s.getTechnologies().stream()
                        .map(Technology::getName)
                        .collect(java.util.stream.Collectors.joining(", ")));
        s.setDocumentationLink(r.documentationLink().trim());
        s.setSubmissionDate(Instant.now());
        try {
            var uri = java.net.URI.create(s.getDocumentationLink());
            if (uri.getHost() == null
                    || uri.getUserInfo() != null
                    || !("http".equalsIgnoreCase(uri.getScheme())
                            || "https".equalsIgnoreCase(uri.getScheme())))
                throw new IllegalArgumentException();
        } catch (IllegalArgumentException e) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Documentation link must be a valid HTTP or HTTPS URL without embedded"
                            + " credentials.");
        }
    }

    private void notifyEvaluation(ProjectSubmission s) {
        boolean qualified = s.getAlignmentScore() >= properties.getReviewThreshold();
        notifications.pod(
                s,
                qualified ? "Idea qualified for review" : "Your idea needs improvement",
                qualified
                        ? "Your project idea has qualified for trainer review."
                        : "Your project idea needs improvement. Please revise and resubmit. See the"
                                + " missing criteria in your evaluation.");
        if (qualified) notifications.trainers(s);
    }
}
