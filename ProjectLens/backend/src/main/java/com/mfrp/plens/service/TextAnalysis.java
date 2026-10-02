package com.mfrp.plens.service;

import com.mfrp.plens.model.ProjectSubmission;

import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;

public final class TextAnalysis {
    private TextAnalysis() {}

    private static final Set<String> STOP_WORDS =
            Set.of(
                    "the",
                    "and",
                    "for",
                    "with",
                    "that",
                    "this",
                    "from",
                    "into",
                    "will",
                    "our",
                    "their",
                    "your",
                    "are",
                    "was",
                    "has",
                    "have",
                    "using",
                    "use",
                    "can",
                    "all",
                    "each",
                    "through",
                    "about",
                    "build",
                    "project",
                    "application",
                    "system",
                    "users",
                    "user",
                    "enable",
                    "provide",
                    "create",
                    "manage",
                    "should",
                    "would",
                    "could",
                    "also",
                    "such",
                    "these",
                    "those",
                    "than",
                    "not",
                    "but");

    public static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFKC)
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{N}]+", " ")
                .trim()
                .replaceAll("\\s+", " ");
    }

    public static String text(ProjectSubmission s) {
        return String.join(
                " ",
                s.getProjectTitle(),
                s.getProblemStatement(),
                s.getObjectives(),
                s.getTechnologies().isEmpty()
                        ? s.getTechnologyStack()
                        : s.getTechnologies().stream()
                                .map(com.mfrp.plens.model.Technology::getName)
                                .collect(java.util.stream.Collectors.joining(" ")));
    }

    public static boolean containsPhrase(String text, String phrase) {
        return (" " + normalize(text) + " ").contains(" " + normalize(phrase) + " ");
    }

    public static Set<String> tokens(String text) {
        return Arrays.stream(normalize(text).split(" "))
                .filter(t -> t.length() > 2 && !STOP_WORDS.contains(t))
                .collect(Collectors.toCollection(TreeSet::new));
    }
}
