package com.mfrp.plens.service;

import com.mfrp.plens.dto.ApiDtos.NotificationResponse;
import com.mfrp.plens.exception.ApiException;
import com.mfrp.plens.model.*;
import com.mfrp.plens.repository.*;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class NotificationService {
    private final NotificationRepository notifications;
    private final UserRepository users;
    private final UserService userService;

    public NotificationService(
            NotificationRepository notifications, UserRepository users, UserService userService) {
        this.notifications = notifications;
        this.users = users;
        this.userService = userService;
    }

    public void send(User user, ProjectSubmission submission, String title, String message) {
        Notification n = new Notification();
        n.setUser(user);
        n.setSubmissionId(submission.getId());
        n.setTitle(title);
        n.setMessage(message);
        notifications.save(n);
    }

    public void pod(ProjectSubmission s, String title, String message) {
        users.findByPodId(s.getPod().getId()).forEach(u -> send(u, s, title, message));
    }

    public void trainers(ProjectSubmission s) {
        users.findByRole(Role.TRAINER)
                .forEach(
                        u ->
                                send(
                                        u,
                                        s,
                                        "New idea ready for review",
                                        s.getPod().getName()
                                                + " submitted "
                                                + s.getProjectTitle()
                                                + ". Alignment: "
                                                + s.getAlignmentScore()
                                                + "%."));
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> list() {
        return notifications
                .findByUserIdOrderByCreatedAtDesc(userService.current().getId())
                .stream()
                .map(this::response)
                .toList();
    }

    public NotificationResponse read(Long id) {
        var n =
                notifications
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        new ApiException(
                                                HttpStatus.NOT_FOUND, "Notification not found."));
        if (!n.getUser().getId().equals(userService.current().getId()))
            throw new ApiException(
                    HttpStatus.FORBIDDEN, "This notification belongs to another user.");
        n.setRead(true);
        return response(notifications.save(n));
    }

    private NotificationResponse response(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getTitle(),
                n.getMessage(),
                n.getSubmissionId(),
                n.isRead(),
                n.getCreatedAt());
    }
}
