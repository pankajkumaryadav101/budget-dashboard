package com.pankaj.budgetapp.service;

import com.pankaj.budgetapp.entity.BudgetItem;
import com.pankaj.budgetapp.repository.BudgetItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional
public class BudgetService {

    private final BudgetItemRepository budgetItemRepository;

    @Autowired
    public BudgetService(BudgetItemRepository budgetItemRepository) {
        this.budgetItemRepository = budgetItemRepository;
    }

    public List<BudgetItem> getAllBudgetItems() {
        return budgetItemRepository.findAll();
    }

    public Optional<BudgetItem> getBudgetItemById(Long id) {
        return budgetItemRepository.findById(id);
    }

    public BudgetItem createBudgetItem(BudgetItem item) {
        item.setCreatedAt(LocalDateTime.now());
        if (item.getTransactionDate() == null) {
            item.setTransactionDate(LocalDate.now());
        }
        return budgetItemRepository.save(item);
    }

    public BudgetItem updateBudgetItem(Long id, BudgetItem itemDetails) {
        return budgetItemRepository.findById(id)
                .map(item -> {
                    item.setName(itemDetails.getName());
                    item.setCategory(itemDetails.getCategory());
                    item.setTransactionType(itemDetails.getTransactionType());
                    item.setAmount(itemDetails.getAmount());
                    item.setTransactionDate(itemDetails.getTransactionDate());
                    item.setNotes(itemDetails.getNotes());
                    item.setRecurring(itemDetails.isRecurring());
                    item.setRecurrenceFrequency(itemDetails.getRecurrenceFrequency());
                    item.setUpdatedAt(LocalDateTime.now());
                    return budgetItemRepository.save(item);
                })
                .orElseThrow(() -> new RuntimeException("BudgetItem not found with id: " + id));
    }

    public void deleteBudgetItem(Long id) {
        budgetItemRepository.deleteById(id);
    }

    public List<BudgetItem> getIncomeItems() {
        return budgetItemRepository.findByTransactionType(BudgetItem.TransactionType.INCOME);
    }

    public List<BudgetItem> getExpenseItems() {
        return budgetItemRepository.findByTransactionType(BudgetItem.TransactionType.EXPENSE);
    }

    public BigDecimal getTotalIncome() {
        return budgetItemRepository.calculateTotalIncome();
    }

    public BigDecimal getTotalExpenses() {
        return budgetItemRepository.calculateTotalExpenses();
    }

    public BigDecimal getBalance() {
        BigDecimal income = getTotalIncome();
        BigDecimal expenses = getTotalExpenses();
        return income.subtract(expenses);
    }

    public List<BudgetItem> getItemsForMonth(int year, int month) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.plusMonths(1).minusDays(1);
        return budgetItemRepository.findByTransactionDateBetween(start, end);
    }

    public Map<String, BigDecimal> getMonthlyBreakdown(int year, int month) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.plusMonths(1).minusDays(1);

        BigDecimal income = budgetItemRepository.calculateIncomeForPeriod(start, end);
        BigDecimal expenses = budgetItemRepository.calculateExpensesForPeriod(start, end);

        Map<String, BigDecimal> breakdown = new HashMap<>();
        breakdown.put("income", income);
        breakdown.put("expenses", expenses);
        breakdown.put("balance", income.subtract(expenses));

        return breakdown;
    }

    public Map<String, BigDecimal> getCategoryBreakdown(BudgetItem.TransactionType type) {
        List<Object[]> results = budgetItemRepository.sumByCategory(type);
        Map<String, BigDecimal> breakdown = new HashMap<>();
        for (Object[] row : results) {
            breakdown.put(((BudgetItem.BudgetCategory) row[0]).name(), (BigDecimal) row[1]);
        }
        return breakdown;
    }

    public List<BudgetItem> getRecurringItems() {
        return budgetItemRepository.findByRecurringTrue();
    }
}
