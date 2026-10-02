package com.mfrp.plens.controller;

import com.mfrp.plens.dto.ApiDtos.*;
import com.mfrp.plens.service.*;

import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
public class ApplicationController {
    private final DashboardService dashboards;
    private final CriteriaService criteria;
    private final NotificationService notifications;
    private final TechnologyCatalog technologies;

    public ApplicationController(
            DashboardService dashboards,
            CriteriaService criteria,
            NotificationService notifications, TechnologyCatalog technologies) {
        this.dashboards = dashboards;
        this.criteria = criteria;
        this.notifications = notifications;
        this.technologies = technologies;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP", "application", "ProjectLens");
    }

    @GetMapping("/dashboard/trainer")
    public DashboardResponse trainer() {
        return dashboards.trainer();
    }

    @GetMapping("/dashboard/pod")
    public DashboardResponse pod() {
        return dashboards.pod();
    }

    @GetMapping("/technologies")
    public List<TechnologySelection> technologies() {
        return technologies.options();
    }

    @GetMapping("/criteria")
    public CriteriaResponse criteria() {
        return criteria.active();
    }

    @GetMapping("/notifications")
    public List<NotificationResponse> notifications() {
        return notifications.list();
    }

    @PatchMapping("/notifications/{id}/read")
    public NotificationResponse read(@PathVariable Long id) {
        return notifications.read(id);
    }
}
