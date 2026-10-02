package com.mfrp.plens.repository;

import com.mfrp.plens.model.*;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainerDecisionRepository extends JpaRepository<TrainerDecision, Long> {
    java.util.List<TrainerDecision> findBySubmissionIdOrderByDecidedAtDesc(Long submissionId);
}
