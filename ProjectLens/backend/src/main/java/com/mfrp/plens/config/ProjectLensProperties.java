package com.mfrp.plens.config;

import jakarta.validation.constraints.*;

import lombok.Getter;
import lombok.Setter;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "projectlens")
public class ProjectLensProperties {
    @Min(1)
    @Max(100)
    private double reviewThreshold;

    @DecimalMin("0.01")
    @DecimalMax("1.0")
    private double overlapMedium;

    @DecimalMin("0.01")
    @DecimalMax("1.0")
    private double overlapHigh;

    private String jwtSecret;

    @Min(1)
    @Max(168)
    private int jwtHours;

    private String corsOrigins;
    private boolean seedEnabled;
    private String seedPassword;

    @AssertTrue(message = "High overlap threshold must exceed medium threshold")
    public boolean isOverlapThresholdsValid() {
        return overlapHigh > overlapMedium;
    }
}
