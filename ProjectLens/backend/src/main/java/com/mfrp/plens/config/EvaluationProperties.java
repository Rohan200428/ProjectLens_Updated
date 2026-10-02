package com.mfrp.plens.config;

import jakarta.validation.constraints.*;

import lombok.Getter;
import lombok.Setter;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Component
@ConfigurationProperties(prefix = "evaluation")
@Getter
@Setter
@Validated
public class EvaluationProperties {
    public enum Mode {
        AUTO,
        RULE_BASED,
        GEMINI
    }

    @NotNull private Mode mode = Mode.AUTO;
    private String apiKey = "";

    @Pattern(regexp = "[a-zA-Z0-9._-]+")
    private String model = "gemini-2.5-flash";

    @Min(1)
    @Max(60)
    private int timeoutSeconds = 12;

    public boolean hasKey() {
        return apiKey != null && !apiKey.isBlank();
    }
}
