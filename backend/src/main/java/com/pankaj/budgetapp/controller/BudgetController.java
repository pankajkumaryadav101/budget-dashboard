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
}
