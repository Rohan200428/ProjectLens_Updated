package com.mfrp.plens.repository;

import com.mfrp.plens.model.*;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PodRepository extends JpaRepository<Pod, Long> {
    @org.springframework.data.jpa.repository.Lock(
            jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from Pod p where p.id = :id")
    java.util.Optional<Pod> lockById(
            @org.springframework.data.repository.query.Param("id") Long id);
}
