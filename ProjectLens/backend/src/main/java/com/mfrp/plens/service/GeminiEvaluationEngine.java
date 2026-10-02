package com.mfrp.plens.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.mfrp.plens.model.*;

import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class GeminiEvaluationEngine implements ProjectEvaluationEngine {
    private final GeminiClient client;

    public GeminiEvaluationEngine(GeminiClient client) {
        this.client = client;
    }

    @Override
    public Result evaluate(String text, List<CohortCriteria> criteria) {
        return evaluate(new Input("", text, "", List.of()), criteria);
    }

    @Override
    public Result evaluate(Input input, List<CohortCriteria> criteria) {
        if (criteria.isEmpty()) throw new IllegalStateException("No active evaluation criteria");
        var context =
                Map.<String, Object>of(
                        "project",
                        input,
                        "cohortTheme",
                        "AI-enabled enterprise applications",
                        "criteria",
                        criteria.stream()
                                .map(
                                        c ->
                                                Map.of(
                                                        "id",
                                                        c.getId(),
                                                        "title",
                                                        c.getTitle(),
                                                        "description",
                                                        c.getDescription(),
                                                        "learningObjective",
                                                        c.getLearningObjective(),
                                                        "keywords",
                                                        c.getKeywords()))
                                .toList());
        var result =
                client.evaluate(context, criteria.stream().map(CohortCriteria::getId).toList());
        if (result == null
                || !result.isObject()
                || !result.path("alignmentScore").isNumber()
                || !Double.isFinite(result.get("alignmentScore").asDouble())
                || result.get("alignmentScore").asDouble() < 0
                || result.get("alignmentScore").asDouble() > 100
                || !result.path("explanation").isTextual()
                || result.get("explanation").asText().isBlank()
                || result.get("explanation").asText().length() > 4000)
            throw new IllegalStateException("Invalid Gemini result");
        Set<String> fields =
                Set.of(
                        "alignmentScore",
                        "matchedCriteria",
                        "missingCriteria",
                        "explanation",
                        "recommendation");
        result.fieldNames()
                .forEachRemaining(
                        k -> {
                            if (!fields.contains(k))
                                throw new IllegalStateException("Unexpected Gemini field");
                        });
        if (result.has("recommendation")
                && (!result.get("recommendation").isTextual()
                        || result.get("recommendation").asText().length() > 1000))
            throw new IllegalStateException("Invalid recommendation");
        Map<Long, CohortCriteria> known = new LinkedHashMap<>();
        criteria.forEach(c -> known.put(c.getId(), c));
        Set<Long> seen = new HashSet<>();
        var matched = resolve(result.path("matchedCriteria"), known, seen);
        var missing = resolve(result.path("missingCriteria"), known, seen);
        if (seen.size() != known.size())
            throw new IllegalStateException("Incomplete criteria coverage");
        String explanation = result.get("explanation").asText();
        if (result.has("recommendation") && !result.get("recommendation").asText().isBlank())
            explanation += "\nSuggestion: " + result.get("recommendation").asText();
        return new Result(
                result.get("alignmentScore").asDouble(),
                matched,
                missing,
                EvaluationSource.GEMINI,
                explanation);
    }

    private List<CohortCriteria> resolve(
            JsonNode list, Map<Long, CohortCriteria> known, Set<Long> seen) {
        if (!list.isArray()) throw new IllegalStateException("Invalid criteria list");
        List<CohortCriteria> result = new ArrayList<>();
        for (var id : list) {
            if (!id.isIntegralNumber()
                    || !id.canConvertToLong()
                    || !known.containsKey(id.longValue())
                    || !seen.add(id.longValue()))
                throw new IllegalStateException("Invalid criterion ID");
            result.add(known.get(id.longValue()));
        }
        return result;
    }
}
