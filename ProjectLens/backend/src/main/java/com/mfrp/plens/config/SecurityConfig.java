package com.mfrp.plens.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mfrp.plens.dto.ApiDtos.ErrorResponse;
import com.mfrp.plens.repository.UserRepository;
import com.mfrp.plens.service.JwtService;

import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;

import java.time.Instant;
import java.util.*;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtService jwt,
            UserRepository users,
            ObjectMapper mapper,
            ProjectLensProperties properties)
            throws Exception {
        http.csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsSource(properties)))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(
                        a ->
                                a.requestMatchers("/api/auth/login", "/api/health")
                                        .permitAll()
                                        .requestMatchers(
                                                org.springframework.http.HttpMethod.POST,
                                                "/api/submissions",
                                                "/api/submissions/*/resubmit")
                                        .hasRole("POD_LEAD")
                                        .requestMatchers(
                                                org.springframework.http.HttpMethod.PUT,
                                                "/api/submissions/*")
                                        .hasRole("POD_LEAD")
                                        .requestMatchers(
                                                "/api/reviews/**", "/api/dashboard/trainer")
                                        .hasRole("TRAINER")
                                        .requestMatchers(
                                                "/api/dashboard/pod", "/api/submissions/my")
                                        .hasAnyRole("POD_LEAD", "POD_MEMBER")
                                        .anyRequest()
                                        .authenticated())
                .exceptionHandling(
                        e ->
                                e.authenticationEntryPoint(
                                                (req, res, ex) -> {
                                                    res.setStatus(401);
                                                    res.setContentType("application/json");
                                                    mapper.writeValue(
                                                            res.getOutputStream(),
                                                            new ErrorResponse(
                                                                    Instant.now(),
                                                                    401,
                                                                    "Please sign in to continue.",
                                                                    req.getRequestURI(),
                                                                    Map.of()));
                                                })
                                        .accessDeniedHandler(
                                                (req, res, ex) -> {
                                                    res.setStatus(403);
                                                    res.setContentType("application/json");
                                                    mapper.writeValue(
                                                            res.getOutputStream(),
                                                            new ErrorResponse(
                                                                    Instant.now(),
                                                                    403,
                                                                    "You do not have permission to"
                                                                        + " perform this action.",
                                                                    req.getRequestURI(),
                                                                    Map.of()));
                                                }))
                .addFilterBefore(
                        new JwtAuthenticationFilter(jwt, users),
                        UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private CorsConfigurationSource corsSource(ProjectLensProperties properties) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(
                Arrays.stream(properties.getCorsOrigins().split(",")).map(String::trim).toList());
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        UrlBasedCorsConfigurationSource s = new UrlBasedCorsConfigurationSource();
        s.registerCorsConfiguration("/api/**", c);
        return s;
    }
}
