package com.mfrp.plens.repository;

import com.mfrp.plens.model.*;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CohortCriteriaRepository extends JpaRepository<CohortCriteria, Long> {
    java.util.List<CohortCriteria> findByActiveTrueOrderByIdAsc();
}
