package com.mfrp.plens.controller;

import com.mfrp.plens.dto.ApiDtos.*;
import com.mfrp.plens.service.SubmissionService;

import jakarta.validation.Valid;

import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {
    private final SubmissionService submissions;

    public SubmissionController(SubmissionService submissions) {
        this.submissions = submissions;
    }

    @PostMapping
    @PreAuthorize("hasRole('POD_LEAD')")
    public ResponseEntity<ProjectSubmissionResponse> create(
            @Valid @RequestBody ProjectSubmissionRequest request) {
        var s = submissions.create(request);
        return ResponseEntity.created(java.net.URI.create("/api/submissions/" + s.id())).body(s);
    }

    @GetMapping("/my")
    public List<ProjectSubmissionResponse> mine() {
        return submissions.mine();
    }

    @GetMapping("/{id}")
    public ProjectSubmissionResponse get(@PathVariable Long id) {
        return submissions.get(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('POD_LEAD')")
    public ProjectSubmissionResponse update(
            @PathVariable Long id, @Valid @RequestBody ProjectSubmissionRequest request) {
        return submissions.revise(id, request);
    }

    @PostMapping("/{id}/resubmit")
    @PreAuthorize("hasRole('POD_LEAD')")
    public ProjectSubmissionResponse resubmit(
            @PathVariable Long id, @Valid @RequestBody ProjectSubmissionRequest request) {
        return submissions.revise(id, request);
    }
}
