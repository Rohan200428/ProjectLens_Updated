package com.mfrp.plens.service;

import com.mfrp.plens.model.CohortCriteria;

import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class RuleBasedEvaluationEngine implements ProjectEvaluationEngine {
    @Override
    public Result evaluate(String text, List<CohortCriteria> criteria) {
        if (criteria.isEmpty())
            throw new IllegalStateException(
                    "Active predefined criteria must be configured before evaluating submissions.");
        List<CohortCriteria> matched = new ArrayList<>(), missing = new ArrayList<>();
        for (var c : criteria) {
            if (c.getKeywords().stream().anyMatch(k -> TextAnalysis.containsPhrase(text, k)))
                matched.add(c);
            else missing.add(c);
        }
        double score = Math.round(matched.size() * 10000.0 / criteria.size()) / 100.0;
        return new Result(score, matched, missing);
    }
}
