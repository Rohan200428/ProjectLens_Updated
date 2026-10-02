package com.mfrp.plens.repository;

import com.mfrp.plens.model.*;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectSubmissionRepository extends JpaRepository<ProjectSubmission, Long> {
    java.util.Optional<ProjectSubmission> findByPodId(Long podId);

    java.util.List<ProjectSubmission> findByAlignmentScoreGreaterThanEqualOrderBySubmissionDateDesc(
            double threshold);

    @org.springframework.data.jpa.repository.Lock(
            jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query(
            "select s from ProjectSubmission s where s.id = :id")
    java.util.Optional<ProjectSubmission> lockById(
            @org.springframework.data.repository.query.Param("id") Long id);
}
