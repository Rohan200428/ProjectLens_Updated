package com.mfrp.plens.service;

import com.mfrp.plens.config.ProjectLensProperties;
import com.mfrp.plens.model.*;

import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class OverlapDetectionService {
    private final ProjectLensProperties properties;

    public OverlapDetectionService(ProjectLensProperties properties) {
        this.properties = properties;
    }

    public record Result(
            OverlapLevel level,
            boolean flag,
            double similarity,
            Long similarId,
            String details,
            List<String> sharedTerms) {}

    public Result detect(ProjectSubmission current, List<ProjectSubmission> candidates) {
        Set<String> terms = TextAnalysis.tokens(TextAnalysis.text(current));
        double best = 0;
        ProjectSubmission closest = null;
        List<String> shared = List.of();
        for (var candidate : candidates) {
            if (Objects.equals(candidate.getId(), current.getId())
                    || Objects.equals(candidate.getPod().getId(), current.getPod().getId()))
                continue;
            Set<String> other = TextAnalysis.tokens(TextAnalysis.text(candidate));
            Set<String> union = new HashSet<>(terms);
            union.addAll(other);
            Set<String> intersection = new TreeSet<>(terms);
            intersection.retainAll(other);
            double similarity = union.isEmpty() ? 0 : (double) intersection.size() / union.size();
            if (similarity > best) {
                best = similarity;
                closest = candidate;
                shared = intersection.stream().limit(20).toList();
            }
        }
        OverlapLevel level =
                best >= properties.getOverlapHigh()
                        ? OverlapLevel.HIGH
                        : best >= properties.getOverlapMedium()
                                ? OverlapLevel.MEDIUM
                                : OverlapLevel.LOW;
        double percentage = Math.round(best * 10000) / 100.0;
        String details =
                closest == null
                        ? "No shared meaningful terms found with other pods."
                        : String.format(
                                Locale.ROOT,
                                "Closest idea: %s (%s). %.2f%% shared-term similarity. Compare"
                                        + " problem and objectives before deciding.",
                                closest.getProjectTitle(),
                                closest.getPod().getName(),
                                percentage);
        return new Result(
                level,
                level != OverlapLevel.LOW,
                percentage,
                closest == null ? null : closest.getId(),
                details,
                shared);
    }
}
