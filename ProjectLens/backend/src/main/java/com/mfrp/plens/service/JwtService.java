package com.mfrp.plens.service;

import com.mfrp.plens.config.ProjectLensProperties;
import com.mfrp.plens.model.User;
import com.nimbusds.jose.jwk.source.ImmutableSecret;

import org.springframework.core.env.Environment;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

import javax.crypto.spec.SecretKeySpec;

@Service
public class JwtService {
    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final ProjectLensProperties properties;

    public JwtService(ProjectLensProperties properties, Environment environment) {
        this.properties = properties;
        String configured = properties.getJwtSecret();
        byte[] bytes;
        if (configured == null || configured.isBlank()) {
            if (!environment.matchesProfiles("dev", "test"))
                throw new IllegalStateException("JWT_SECRET is required outside dev/test");
            bytes = new byte[64];
            new java.security.SecureRandom().nextBytes(bytes);
        } else {
            bytes = configured.getBytes(StandardCharsets.UTF_8);
            if (bytes.length < 32)
                throw new IllegalStateException("JWT_SECRET must be at least 32 bytes");
        }
        SecretKeySpec key = new SecretKeySpec(bytes, "HmacSHA256");
        encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        NimbusJwtDecoder nimbus =
                NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        nimbus.setJwtValidator(JwtValidators.createDefaultWithIssuer("projectlens"));
        decoder = nimbus;
    }

    public Jwt issue(User user) {
        Instant now = Instant.now();
        JwtClaimsSet claims =
                JwtClaimsSet.builder()
                        .issuer("projectlens")
                        .subject(user.getEmail())
                        .issuedAt(now)
                        .expiresAt(now.plusSeconds(properties.getJwtHours() * 3600L))
                        .id(UUID.randomUUID().toString())
                        .build();
        return encoder.encode(
                JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims));
    }

    public String validateSubject(String token) {
        return decoder.decode(token).getSubject();
    }
}
