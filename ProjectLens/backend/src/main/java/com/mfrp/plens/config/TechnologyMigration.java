package com.mfrp.plens.config;

import com.mfrp.plens.repository.ProjectSubmissionRepository;
import com.mfrp.plens.service.TechnologyCatalog;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;

@Component
@Order(10)
public class TechnologyMigration implements ApplicationRunner {
    private final ProjectSubmissionRepository submissions;

    public TechnologyMigration(ProjectSubmissionRepository submissions) {
        this.submissions = submissions;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (var s : submissions.findAll())
            if (s.getTechnologies().isEmpty()) {
                s.setTechnologies(
                        new ArrayList<>(TechnologyCatalog.fromLegacy(s.getTechnologyStack())));
            }
    }
}
