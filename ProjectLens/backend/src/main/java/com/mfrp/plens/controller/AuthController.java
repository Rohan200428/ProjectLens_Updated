package com.mfrp.plens.controller;

import com.mfrp.plens.dto.ApiDtos.*;
import com.mfrp.plens.service.UserService;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserService users;

    public AuthController(UserService users) {
        this.users = users;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return users.login(request);
    }

    @GetMapping("/me")
    public UserResponse me() {
        return users.profile();
    }
}
