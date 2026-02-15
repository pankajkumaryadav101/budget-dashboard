package com.pankaj.budgetapp.controller;

import com.pankaj.budgetapp.entity.BudgetItem;
import com.pankaj.budgetapp.service.BudgetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/budget")
public class BudgetController {

    private final BudgetService budgetService;

    @Autowired
    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    @GetMapping
    public ResponseEntity<List<BudgetItem>> getAllBudgetItems() {
        return ResponseEntity.ok(budgetService.getAllBudgetItems());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BudgetItem> getBudgetItemById(@PathVariable Long id) {
        return budgetService.getBudgetItemById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<BudgetItem> createBudgetItem(@RequestBody BudgetItem item) {
        BudgetItem created = budgetService.createBudgetItem(item);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BudgetItem> updateBudgetItem(
            @PathVariable Long id,
            @RequestBody BudgetItem item) {
        try {
            BudgetItem updated = budgetService.updateBudgetItem(id, item);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBudgetItem(@PathVariable Long id) {
        budgetService.deleteBudgetItem(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/income")
    public ResponseEntity<List<BudgetItem>> getIncomeItems() {
        return ResponseEntity.ok(budgetService.getIncomeItems());
    }

    @GetMapping("/expenses")
    public ResponseEntity<List<BudgetItem>> getExpenseItems() {
        return ResponseEntity.ok(budgetService.getExpenseItems());
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, BigDecimal>> getBudgetSummary() {
        Map<String, BigDecimal> summary = new HashMap<>();
        summary.put("totalIncome", budgetService.getTotalIncome());
        summary.put("totalExpenses", budgetService.getTotalExpenses());
        summary.put("balance", budgetService.getBalance());
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/monthly")
    public ResponseEntity<Map<String, BigDecimal>> getMonthlyBreakdown(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        LocalDate now = LocalDate.now();
        int y = year != null ? year : now.getYear();
        int m = month != null ? month : now.getMonthValue();
        return ResponseEntity.ok(budgetService.getMonthlyBreakdown(y, m));
    }

    @GetMapping("/monthly/items")
    public ResponseEntity<List<BudgetItem>> getItemsForMonth(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        LocalDate now = LocalDate.now();
        int y = year != null ? year : now.getYear();
        int m = month != null ? month : now.getMonthValue();
        return ResponseEntity.ok(budgetService.getItemsForMonth(y, m));
    }

    @GetMapping("/categories/income")
    public ResponseEntity<Map<String, BigDecimal>> getIncomeCategoryBreakdown() {
        return ResponseEntity.ok(budgetService.getCategoryBreakdown(BudgetItem.TransactionType.INCOME));
    }

    @GetMapping("/categories/expenses")
    public ResponseEntity<Map<String, BigDecimal>> getExpenseCategoryBreakdown() {
        return ResponseEntity.ok(budgetService.getCategoryBreakdown(BudgetItem.TransactionType.EXPENSE));
    }

    @GetMapping("/recurring")
    public ResponseEntity<List<BudgetItem>> getRecurringItems() {
        return ResponseEntity.ok(budgetService.getRecurringItems());
    }

    @GetMapping("/analysis")
    public ResponseEntity<Map<String, Object>> getBudgetAnalysis() {
        Map<String, Object> result = new HashMap<>();
        // Get all transactions and income
        List<BudgetItem> allItems = budgetService.getAllItems();
        BigDecimal totalIncome = budgetService.getTotalIncome();
        BigDecimal totalExpenses = budgetService.getTotalExpenses();

        // Recommended budget percentages (example: 50/30/20 rule)
        Map<String, Double> recommended = new HashMap<>();
        recommended.put("RENT", 0.3);
        recommended.put("GROCERIES", 0.1);
        recommended.put("UTILITIES", 0.05);
        recommended.put("ENTERTAINMENT", 0.05);
        recommended.put("SAVINGS", 0.2);
        recommended.put("TRANSPORTATION", 0.1);
        recommended.put("HEALTHCARE", 0.05);
        recommended.put("SHOPPING", 0.05);
        recommended.put("OTHER_EXPENSE", 0.1);

        // Sum by category
        Map<String, BigDecimal> spentByCategory = new HashMap<>();
        for (BudgetItem item : allItems) {
            if (item.getTransactionType() != null && item.getTransactionType().toString().equals("EXPENSE")) {
                String cat = item.getCategory() != null ? item.getCategory().toString() : "OTHER_EXPENSE";
                spentByCategory.put(cat, spentByCategory.getOrDefault(cat, BigDecimal.ZERO).add(item.getAmount()));
            }
        }

        // Analysis logic
        List<Map<String, String>> analysis = new java.util.ArrayList<>();
        for (Map.Entry<String, Double> entry : recommended.entrySet()) {
            String cat = entry.getKey();
            double percent = entry.getValue();
            BigDecimal spent = spentByCategory.getOrDefault(cat, BigDecimal.ZERO);
            double actualPercent = totalIncome.compareTo(BigDecimal.ZERO) > 0 ? spent.doubleValue() / totalIncome.doubleValue() : 0;
            if (actualPercent > percent) {
                analysis.add(Map.of(
                    "category", cat,
                    "status", "over",
                    "message", String.format("You are spending %.0f%% on %s, above the recommended %.0f%%.", actualPercent*100, cat, percent*100)
                ));
            } else if (actualPercent < percent * 0.5) {
                analysis.add(Map.of(
                    "category", cat,
                    "status", "under",
                    "message", String.format("You are spending less than half the recommended amount on %s.", cat)
                ));
            } else {
                analysis.add(Map.of(
                    "category", cat,
                    "status", "ok",
                    "message", String.format("Your spending on %s is within a healthy range.", cat)
                ));
            }
        }

        // Savings check
        BigDecimal savings = totalIncome.subtract(totalExpenses);
        double savingsPercent = totalIncome.compareTo(BigDecimal.ZERO) > 0 ? savings.doubleValue() / totalIncome.doubleValue() : 0;
        if (savingsPercent < 0.1) {
            analysis.add(Map.of(
                "category", "SAVINGS",
                "status", "low",
                "message", "Your savings rate is below 10%. Try to save more each month."
            ));
        } else if (savingsPercent >= 0.2) {
            analysis.add(Map.of(
                "category", "SAVINGS",
                "status", "good",
                "message", "Great job! You are saving at least 20% of your income."
            ));
        }

        result.put("analysis", analysis);
        result.put("spentByCategory", spentByCategory);
        result.put("totalIncome", totalIncome);
        result.put("totalExpenses", totalExpenses);
        result.put("savings", savings);
        return ResponseEntity.ok(result);
    }
}
