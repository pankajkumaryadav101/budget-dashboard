package com.pankaj.budgetapp.controller;

import com.pankaj.budgetapp.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    @Autowired
    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/reminders")
    public ResponseEntity<List<NotificationService.Reminder>> getReminders() {
        return ResponseEntity.ok(notificationService.getReminders());
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Integer>> getReminderCount() {
        List<NotificationService.Reminder> reminders = notificationService.getReminders();
        int critical = (int) reminders.stream()
                .filter(r -> r.getType() == NotificationService.ReminderType.CRITICAL)
                .count();
        int warnings = (int) reminders.stream()
                .filter(r -> r.getType() == NotificationService.ReminderType.WARNING)
                .count();
        int info = (int) reminders.stream()
                .filter(r -> r.getType() == NotificationService.ReminderType.INFO)
                .count();

        return ResponseEntity.ok(Map.of(
                "total", reminders.size(),
                "critical", critical,
                "warnings", warnings,
                "info", info
        ));
    }
}
