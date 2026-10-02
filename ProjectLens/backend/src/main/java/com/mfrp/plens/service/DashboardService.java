package com.mfrp.plens.service;

import com.mfrp.plens.config.ProjectLensProperties;
import com.mfrp.plens.dto.ApiDtos.*;
import com.mfrp.plens.model.SubmissionStatus;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class DashboardService {
    private final ReviewService reviews;
    private final SubmissionService submissions;
    private final ProjectLensProperties properties;

    public DashboardService(
            ReviewService reviews,
            SubmissionService submissions,
            ProjectLensProperties properties) {
        this.reviews = reviews;
        this.submissions = submissions;
        this.properties = properties;
    }

    public DashboardResponse trainer() {
        return response(reviews.list());
    }

    public DashboardResponse pod() {
        return response(submissions.mine());
    }

    private DashboardResponse response(List<ProjectSubmissionResponse> list) {
        return new DashboardResponse(
                new DashboardStatsResponse(
                        list.size(),
                        Math.round(
                                        list.stream()
                                                        .mapToDouble(
                                                                ProjectSubmissionResponse
                                                                        ::alignmentScore)
                                                        .average()
                                                        .orElse(0)
                                                * 100)
                                / 100.0,
                        list.stream().filter(ProjectSubmissionResponse::overlapFlag).count(),
                        count(list, SubmissionStatus.PENDING_REVIEW),
                        count(list, SubmissionStatus.APPROVED),
                        count(list, SubmissionStatus.NEEDS_REVISION),
                        count(list, SubmissionStatus.REJECTED),
                        properties.getReviewThreshold()),
                list);
    }

    private long count(List<ProjectSubmissionResponse> list, SubmissionStatus status) {
        return list.stream().filter(s -> s.status() == status).count();
    }
}
