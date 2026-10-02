package com.mfrp.plens.repository;

import com.mfrp.plens.model.*;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionEvaluationRepository extends JpaRepository<SubmissionEvaluation, Long> {
    java.util.Optional<SubmissionEvaluation> findBySubmissionId(Long submissionId);
}
