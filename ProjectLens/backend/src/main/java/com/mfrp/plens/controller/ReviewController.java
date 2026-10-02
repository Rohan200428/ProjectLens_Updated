package com.mfrp.plens.controller;

import com.mfrp.plens.dto.ApiDtos.*;
import com.mfrp.plens.service.*;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {
    private final ReviewService reviews;
    private final SubmissionService submissions;

    public ReviewController(ReviewService reviews, SubmissionService submissions) {
        this.reviews = reviews;
        this.submissions = submissions;
    }

    @GetMapping
    public List<ProjectSubmissionResponse> list() {
        return reviews.list();
    }

    @GetMapping("/{id}")
    public ProjectSubmissionResponse get(@PathVariable Long id) {
        return submissions.get(id);
    }

    @PostMapping("/{id}/decision")
    public ProjectSubmissionResponse decide(
            @PathVariable Long id, @Valid @RequestBody TrainerDecisionRequest request) {
        return reviews.decide(id, request);
    }
}
