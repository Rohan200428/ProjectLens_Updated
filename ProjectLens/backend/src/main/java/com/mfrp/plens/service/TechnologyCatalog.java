package com.mfrp.plens.service;

import com.mfrp.plens.dto.ApiDtos.TechnologySelection;
import com.mfrp.plens.exception.ApiException;
import com.mfrp.plens.model.*;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class TechnologyCatalog {
    private static final List<TechnologySelection> OPTIONS = build();

    private static List<TechnologySelection> build() {
        List<TechnologySelection> result = new ArrayList<>();
        group(
                result,
                TechnologyCategory.FRONTEND,
                "Angular",
                "React",
                "Vue.js",
                "HTML/CSS",
                "Svelte");
        group(
                result,
                TechnologyCategory.BACKEND,
                "Spring Boot",
                "Node.js",
                "Express.js",
                "Django",
                "FastAPI",
                ".NET");
        group(
                result,
                TechnologyCategory.DATABASE,
                "MySQL",
                "PostgreSQL",
                "MongoDB",
                "Oracle",
                "SQL Server",
                "Redis");
        group(
                result,
                TechnologyCategory.LANGUAGE,
                "Java",
                "Python",
                "C++",
                "JavaScript",
                "TypeScript",
                "C#");
        group(
                result,
                TechnologyCategory.DEVOPS_CLOUD,
                "Docker",
                "Kubernetes",
                "AWS",
                "Azure",
                "GCP",
                "CI/CD");
        group(
                result,
                TechnologyCategory.TOOLS_OTHER,
                "Git",
                "GitHub",
                "REST API",
                "GraphQL",
                "OpenAI API",
                "Gemini API");
        return List.copyOf(result);
    }

    private static void group(
            List<TechnologySelection> result, TechnologyCategory category, String... names) {
        for (String name : names) result.add(new TechnologySelection(name, category));
    }

    public List<TechnologySelection> options() {
        return OPTIONS;
    }

    public List<Technology> validate(List<TechnologySelection> selections) {
        Set<String> seen = new HashSet<>();
        List<Technology> result = new ArrayList<>();
        for (var t : selections) {
            String name = t.name().trim();
            if (name.isBlank() || !seen.add(name.toLowerCase(Locale.ROOT)))
                throw new ApiException(HttpStatus.BAD_REQUEST, "Select each technology only once.");
            var known = OPTIONS.stream().filter(o -> o.name().equalsIgnoreCase(name)).findFirst();
            if (known.isPresent() && known.get().category() != t.category())
                throw new ApiException(
                        HttpStatus.BAD_REQUEST, "Technology category does not match the catalog.");
            // Older submissions may contain tools beyond the current catalog.
            if (known.isEmpty() && t.category() != TechnologyCategory.TOOLS_OTHER)
                throw new ApiException(
                        HttpStatus.BAD_REQUEST, "Unknown technology. Choose a listed technology.");
            result.add(
                    new Technology(
                            known.map(TechnologySelection::name).orElse(name), t.category()));
        }
        return result;
    }

    public static List<Technology> fromLegacy(String text) {
        return Arrays.stream(text.split(",|;|\\s+\\+\\s+"))
                .map(String::trim)
                .filter(n -> !n.isEmpty())
                .distinct()
                .map(
                        n ->
                                OPTIONS.stream()
                                        .filter(o -> o.name().equalsIgnoreCase(n))
                                        .findFirst()
                                        .map(o -> new Technology(o.name(), o.category()))
                                        .orElseGet(
                                                () ->
                                                        new Technology(
                                                                n, TechnologyCategory.TOOLS_OTHER)))
                .toList();
    }
}
