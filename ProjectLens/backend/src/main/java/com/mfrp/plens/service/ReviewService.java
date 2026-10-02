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
import java.util.List;

@Service
@Transactional
public class ReviewService {
    private final ProjectSubmissionRepository submissions;
    private final TrainerDecisionRepository decisions;
    private final SubmissionMapper mapper;
    private final UserService users;
    private final NotificationService notifications;
    private final ProjectLensProperties properties;

    public ReviewService(
            ProjectSubmissionRepository submissions,
            TrainerDecisionRepository decisions,
            SubmissionMapper mapper,
            UserService users,
            NotificationService notifications,
            ProjectLensProperties properties) {
        this.submissions = submissions;
        this.decisions = decisions;
        this.mapper = mapper;
        this.users = users;
        this.notifications = notifications;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public List<ProjectSubmissionResponse> list() {
        trainer();
        return submissions
                .findByAlignmentScoreGreaterThanEqualOrderBySubmissionDateDesc(
                        properties.getReviewThreshold())
                .stream()
                .map(mapper::response)
                .toList();
    }

    public ProjectSubmissionResponse decide(Long id, TrainerDecisionRequest request) {
        User trainer = trainer();
        var s =
                submissions
                        .lockById(id)
                        .orElseThrow(
                                () ->
                                        new ApiException(
                                                HttpStatus.NOT_FOUND, "Submission not found."));
        if (s.getAlignmentScore() < properties.getReviewThreshold())
            throw new ApiException(HttpStatus.NOT_FOUND, "Submission not found.");
        if (s.getStatus() != SubmissionStatus.PENDING_REVIEW)
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "This idea already has a decision. A new review follows a Pod Lead revision.");
        if (!request.version().equals(s.getVersion()))
            throw new ApiException(
                    HttpStatus.CONFLICT, "The submission changed. Refresh before reviewing.");
        TrainerDecision d = new TrainerDecision();
        d.setSubmission(s);
        d.setDecision(request.decision());
        d.setComments(request.comments().trim());
        d.setDecidedBy(trainer);
        d.setDecidedAt(Instant.now());
        decisions.save(d);
        s.setStatus(SubmissionStatus.valueOf(request.decision().name()));
        submissions.saveAndFlush(s);
        notifications.pod(
                s,
                "Trainer decision: " + request.decision().name().toLowerCase().replace('_', ' '),
                "Your project “"
                        + s.getProjectTitle()
                        + "” has been "
                        + switch (request.decision()) {
                            case APPROVED -> "approved.";
                            case NEEDS_REVISION -> "returned for revision.";
                            case REJECTED -> "rejected.";
                        }
                        + " Read the trainer comments for next steps.");
        return mapper.response(s);
    }

    private User trainer() {
        User u = users.current();
        if (u.getRole() != Role.TRAINER)
            throw new ApiException(HttpStatus.FORBIDDEN, "Trainer access is required.");
        return u;
    }
}
