package com.mfrp.plens.repository;

import com.mfrp.plens.model.*;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    java.util.Optional<User> findByEmailIgnoreCase(String email);

    java.util.List<User> findByPodId(Long podId);

    java.util.List<User> findByRole(Role role);
}
