package com.mfrp.plens.service;

import com.mfrp.plens.config.EvaluationProperties;
import com.mfrp.plens.model.CohortCriteria;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Primary
public class ConfiguredEvaluationEngine implements ProjectEvaluationEngine {
    private final RuleBasedEvaluationEngine rules;
    private final GeminiEvaluationEngine gemini;
    private final EvaluationProperties config;

    public ConfiguredEvaluationEngine(
            RuleBasedEvaluationEngine rules,
            GeminiEvaluationEngine gemini,
            EvaluationProperties config) {
        this.rules = rules;
        this.gemini = gemini;
        this.config = config;
    }

    @Override
    public Result evaluate(String text, List<CohortCriteria> criteria) {
        return evaluate(new Input("", text, "", List.of()), criteria);
    }

    @Override
    public Result evaluate(Input input, List<CohortCriteria> criteria) {
        if (config.getMode() != EvaluationProperties.Mode.RULE_BASED && config.hasKey()) {
            try {
                return gemini.evaluate(input, criteria);
            } catch (RuntimeException ignored) {
                /* No external response or credentials in logs; reliable local fallback. */
            }
        }
        return rules.evaluate(input, criteria);
    }
}
