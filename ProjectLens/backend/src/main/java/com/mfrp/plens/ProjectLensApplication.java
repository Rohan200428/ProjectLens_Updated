package com.mfrp.plens;

import com.mfrp.plens.config.ProjectLensProperties;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication(
        exclude =
                org.springframework.boot.autoconfigure.security.servlet
                        .UserDetailsServiceAutoConfiguration.class)
@EnableConfigurationProperties(ProjectLensProperties.class)
public class ProjectLensApplication {
    public static void main(String[] args) {
        SpringApplication.run(ProjectLensApplication.class, args);
    }
}
