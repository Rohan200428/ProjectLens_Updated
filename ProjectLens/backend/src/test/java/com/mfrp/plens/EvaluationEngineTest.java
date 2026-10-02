package com.mfrp.plens;

import static org.assertj.core.api.Assertions.*;

import com.mfrp.plens.config.ProjectLensProperties;
import com.mfrp.plens.model.*;
import com.mfrp.plens.service.*;

import org.junit.jupiter.api.Test;

import java.util.*;

class EvaluationEngineTest {
    @Test
    void scoringUsesWholePhrasesAndNormalizesCase() {
        CohortCriteria ai = new CohortCriteria();
        ai.setKeywords(List.of("ai"));
        CohortCriteria spring = new CohortCriteria();
        spring.setKeywords(List.of("spring boot"));
        var engine = new RuleBasedEvaluationEngine();
        assertThat(engine.evaluate("Daily pain", List.of(ai)).score()).isZero();
        assertThat(engine.evaluate("AI, Spring-Boot", List.of(ai, spring)).score()).isEqualTo(100);
        assertThat(engine.evaluate("AI", List.of(ai, spring)).score()).isEqualTo(50);
        assertThatThrownBy(() -> engine.evaluate("AI", List.of()))
                .isInstanceOf(IllegalStateException.class);
    }

    private ProjectSubmission idea(long id, long podId, String text) {
        Pod pod = new Pod();
        pod.setId(podId);
        var s = new ProjectSubmission();
        s.setId(id);
        s.setPod(pod);
        s.setProjectTitle(text);
        s.setProblemStatement(text);
        s.setObjectives(text);
        s.setTechnologyStack(text);
        return s;
    }

    @Test
    void overlapIgnoresOwnPodAndCurrentSubmission() {
        ProjectLensProperties p = new ProjectLensProperties();
        p.setOverlapMedium(.25);
        p.setOverlapHigh(.55);
        var service = new OverlapDetectionService(p);
        var current = idea(1, 1, "energy meter laboratory forecast");
        assertThat(
                        service.detect(
                                        current,
                                        List.of(
                                                current,
                                                idea(2, 1, "energy meter laboratory forecast")))
                                .flag())
                .isFalse();
        var result =
                service.detect(current, List.of(idea(3, 2, "energy meter laboratory forecast")));
        assertThat(result.level()).isEqualTo(OverlapLevel.HIGH);
        assertThat(result.similarity()).isEqualTo(100);
        assertThat(result.similarId()).isEqualTo(3);
        assertThat(result.sharedTerms()).contains("laboratory");
    }

    @Test
    void overlapThresholdsAndEmptyTextAreHandled() {
        ProjectLensProperties p = new ProjectLensProperties();
        p.setOverlapMedium(.25);
        p.setOverlapHigh(.55);
        var service = new OverlapDetectionService(p);
        assertThat(
                        service.detect(
                                        idea(1, 1, "apple pear peach"),
                                        List.of(idea(2, 2, "apple pear plum")))
                                .level())
                .isEqualTo(OverlapLevel.MEDIUM);
        assertThat(service.detect(idea(1, 1, ""), List.of(idea(2, 2, ""))).similarity()).isZero();
        p.setOverlapMedium(.6);
        p.setOverlapHigh(.9);
        assertThat(
                        service.detect(
                                        idea(1, 1, "apple pear peach"),
                                        List.of(idea(2, 2, "apple pear plum")))
                                .level())
                .isEqualTo(OverlapLevel.LOW);
    }
}
