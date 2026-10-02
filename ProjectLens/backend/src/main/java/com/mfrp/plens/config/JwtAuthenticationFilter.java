package com.mfrp.plens.config;

import com.mfrp.plens.repository.UserRepository;
import com.mfrp.plens.service.JwtService;

import jakarta.servlet.*;
import jakarta.servlet.http.*;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final UserRepository users;

    public JwtAuthenticationFilter(JwtService jwt, UserRepository users) {
        this.jwt = jwt;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                String email = jwt.validateSubject(header.substring(7));
                users.findByEmailIgnoreCase(email)
                        .ifPresent(
                                user ->
                                        SecurityContextHolder.getContext()
                                                .setAuthentication(
                                                        new UsernamePasswordAuthenticationToken(
                                                                user.getEmail(),
                                                                null,
                                                                List.of(
                                                                        new SimpleGrantedAuthority(
                                                                                "ROLE_"
                                                                                        + user.getRole()
                                                                                                .name())))));
            } catch (JwtException | IllegalArgumentException e) {
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }
}
