package com.pankaj.budgetapp.controller;

import com.pankaj.budgetapp.entity.Asset;
import com.pankaj.budgetapp.service.AssetService;
import com.pankaj.budgetapp.service.BudgetService;
import com.pankaj.budgetapp.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final AssetService assetService;
    private final BudgetService budgetService;
    private final NotificationService notificationService;

    @Autowired
    public DashboardController(AssetService assetService,
                               BudgetService budgetService,
                               NotificationService notificationService) {
        this.assetService = assetService;
        this.budgetService = budgetService;
        this.notificationService = notificationService;
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getDashboardSummary() {
        Map<String, Object> summary = new HashMap<>();

        // Net Worth from assets
        BigDecimal netWorth = assetService.calculateTotalNetWorth();
        summary.put("netWorth", netWorth);

        // Budget summary
        BigDecimal totalIncome = budgetService.getTotalIncome();
        BigDecimal totalExpenses = budgetService.getTotalExpenses();
        BigDecimal balance = budgetService.getBalance();

        summary.put("totalIncome", totalIncome);
        summary.put("totalExpenses", totalExpenses);
        summary.put("balance", balance);

        // Current month breakdown
        LocalDate now = LocalDate.now();
        Map<String, BigDecimal> monthlyBreakdown = budgetService.getMonthlyBreakdown(
                now.getYear(), now.getMonthValue());
        summary.put("monthlyIncome", monthlyBreakdown.get("income"));
        summary.put("monthlyExpenses", monthlyBreakdown.get("expenses"));
        summary.put("monthlyBalance", monthlyBreakdown.get("balance"));

        // Asset count by type
        List<Asset> allAssets = assetService.getAllAssets();
        Map<String, Long> assetsByType = new HashMap<>();
        for (Asset.AssetType type : Asset.AssetType.values()) {
            long count = allAssets.stream()
                    .filter(a -> a.getType() == type)
                    .count();
            if (count > 0) {
                assetsByType.put(type.name(), count);
            }
        }
        summary.put("assetsByType", assetsByType);
        summary.put("totalAssets", allAssets.size());

        // Stale assets count
        List<Asset> staleAssets = assetService.getStaleAssets();
        summary.put("staleAssetsCount", staleAssets.size());

        // Reminder count
        List<NotificationService.Reminder> reminders = notificationService.getReminders();
        summary.put("reminderCount", reminders.size());
        summary.put("criticalReminders", reminders.stream()
                .filter(r -> r.getType() == NotificationService.ReminderType.CRITICAL)
                .count());

        return ResponseEntity.ok(summary);
    }
}
