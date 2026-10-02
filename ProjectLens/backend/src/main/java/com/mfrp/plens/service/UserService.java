package com.mfrp.plens.service;

import com.mfrp.plens.dto.ApiDtos.*;
import com.mfrp.plens.exception.ApiException;
import com.mfrp.plens.model.*;
import com.mfrp.plens.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class UserService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JwtService jwt;
    private final String dummyHash;

    public UserService(UserRepository users, PasswordEncoder passwords, JwtService jwt) {
        this.users = users;
        this.passwords = passwords;
        this.jwt = jwt;
        dummyHash = passwords.encode(java.util.UUID.randomUUID().toString());
    }

    public LoginResponse login(LoginRequest request) {
        User user = users.findByEmailIgnoreCase(request.email().trim()).orElse(null);
        boolean matches = false;
        try {
            matches =
                    passwords.matches(
                            request.password(), user == null ? dummyHash : user.getPassword());
        } catch (IllegalArgumentException ignored) {
            /* BCrypt rejects credentials beyond its supported byte length. */
        }
        if (user == null || !matches)
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
        var token = jwt.issue(user);
        return new LoginResponse(token.getTokenValue(), token.getExpiresAt(), response(user));
    }

    public User current() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null)
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in to continue.");
        return users.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(
                        () ->
                                new ApiException(
                                        HttpStatus.UNAUTHORIZED, "Please sign in to continue."));
    }

    public UserResponse profile() {
        return response(current());
    }

    public static UserResponse response(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getPod() == null ? null : user.getPod().getId(),
                user.getPod() == null ? null : user.getPod().getName());
    }
}
