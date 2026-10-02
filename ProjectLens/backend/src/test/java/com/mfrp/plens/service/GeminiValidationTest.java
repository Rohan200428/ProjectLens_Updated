package com.mfrp.plens.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mfrp.plens.config.EvaluationProperties;
import com.mfrp.plens.model.CohortCriteria;

import org.junit.jupiter.api.Test;

import java.util.List;

class GeminiValidationTest {
    @Test
    void everyInvalidShapeFallsBackToRules() throws Exception {
        var client = mock(GeminiClient.class);
        var config = new EvaluationProperties();
        config.setApiKey("placeholder");
        var engine =
                new ConfiguredEvaluationEngine(
                        new RuleBasedEvaluationEngine(),
                        new GeminiEvaluationEngine(client),
                        config);
        var c = new CohortCriteria();
        c.setId(1L);
        c.setTitle("API");
        c.setDescription("Build an API");
        c.setLearningObjective("HTTP");
        c.setKeywords(List.of("rest api"));
        for (String response :
                List.of(
                        "{\"alignmentScore\":101,\"matchedCriteria\":[1],\"missingCriteria\":[],\"explanation\":\"Evidence\"}",
                        "{\"alignmentScore\":-1,\"matchedCriteria\":[1],\"missingCriteria\":[],\"explanation\":\"Evidence\"}",
                        "{\"alignmentScore\":\"100\",\"matchedCriteria\":[1],\"missingCriteria\":[],\"explanation\":\"Evidence\"}",
                        "{\"alignmentScore\":90,\"matchedCriteria\":[1,1],\"missingCriteria\":[],\"explanation\":\"Evidence\"}",
                        "{\"alignmentScore\":90,\"matchedCriteria\":[],\"missingCriteria\":[],\"explanation\":\"Evidence\"}",
                        "{\"alignmentScore\":90,\"matchedCriteria\":[1],\"missingCriteria\":[1],\"explanation\":\"Evidence\"}",
                        "{\"alignmentScore\":90,\"matchedCriteria\":[1],\"missingCriteria\":[],\"explanation\":\"\",\"status\":\"APPROVED\"}")) {
            when(client.evaluate(anyMap(), anyList()))
                    .thenReturn(new ObjectMapper().readTree(response));
            assertThat(engine.evaluate("REST API", List.of(c)).source().name())
                    .isEqualTo("RULE_BASED");
        }
    }
}
