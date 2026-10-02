package com.mfrp.plens.repository;

import com.mfrp.plens.model.*;

import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    java.util.List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
}
