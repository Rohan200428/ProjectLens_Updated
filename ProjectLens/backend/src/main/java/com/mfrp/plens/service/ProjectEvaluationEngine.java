package com.mfrp.plens.service;

import com.mfrp.plens.dto.ApiDtos.TechnologySelection;
import com.mfrp.plens.model.*;

import java.util.List;

public interface ProjectEvaluationEngine {
    String RULE_EXPLANATION =
            "Matched criteria / active criteria × 100. Each criterion matches when at least one"
                + " listed keyword or phrase appears in the idea.";

    record Input(
            String projectTitle,
            String problemStatement,
            String objectives,
            List<TechnologySelection> technologyStack) {
        public String text() {
            return String.join(
                    " ",
                    projectTitle,
                    problemStatement,
                    objectives,
                    technologyStack.stream()
                            .map(TechnologySelection::name)
                            .collect(java.util.stream.Collectors.joining(" ")));
        }

        public static Input from(ProjectSubmission s) {
            return new Input(
                    s.getProjectTitle(),
                    s.getProblemStatement(),
                    s.getObjectives(),
                    s.getTechnologies().stream()
                            .map(t -> new TechnologySelection(t.getName(), t.getCategory()))
                            .toList());
        }
    }

    record Result(
            double score,
            List<CohortCriteria> matched,
            List<CohortCriteria> missing,
            EvaluationSource source,
            String explanation) {
        public Result(double score, List<CohortCriteria> matched, List<CohortCriteria> missing) {
            this(score, matched, missing, EvaluationSource.RULE_BASED, RULE_EXPLANATION);
        }
    }

    Result evaluate(String text, List<CohortCriteria> criteria);

    default Result evaluate(Input input, List<CohortCriteria> criteria) {
        return evaluate(input.text(), criteria);
    }
}
