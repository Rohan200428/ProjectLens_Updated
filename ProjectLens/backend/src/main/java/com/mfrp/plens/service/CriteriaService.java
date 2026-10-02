package com.mfrp.plens.service;

import com.mfrp.plens.config.ProjectLensProperties;
import com.mfrp.plens.dto.ApiDtos.*;
import com.mfrp.plens.repository.CohortCriteriaRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CriteriaService {
    public static final String THEME = "AI-enabled enterprise applications";
    private final CohortCriteriaRepository criteria;
    private final ProjectLensProperties properties;

    public CriteriaService(CohortCriteriaRepository criteria, ProjectLensProperties properties) {
        this.criteria = criteria;
        this.properties = properties;
    }

    public CriteriaResponse active() {
        return new CriteriaResponse(
                THEME,
                properties.getReviewThreshold(),
                properties.getOverlapMedium(),
                properties.getOverlapHigh(),
                criteria.findByActiveTrueOrderByIdAsc().stream()
                        .map(
                                c ->
                                        new CohortCriteriaResponse(
                                                c.getId(),
                                                c.getTitle(),
                                                c.getDescription(),
                                                c.getLearningObjective(),
                                                java.util.List.copyOf(c.getKeywords()),
                                                c.isActive()))
                        .toList());
    }
}
