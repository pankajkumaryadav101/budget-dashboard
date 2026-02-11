package com.pankaj.budgetapp.repository;

import com.pankaj.budgetapp.entity.BudgetItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface BudgetItemRepository extends JpaRepository<BudgetItem, Long> {

    List<BudgetItem> findByTransactionType(BudgetItem.TransactionType type);

    List<BudgetItem> findByCategory(BudgetItem.BudgetCategory category);

    List<BudgetItem> findByTransactionDateBetween(LocalDate start, LocalDate end);

    @Query("SELECT b FROM BudgetItem b WHERE b.transactionType = :type AND b.transactionDate BETWEEN :start AND :end")
    List<BudgetItem> findByTypeAndDateRange(
            @Param("type") BudgetItem.TransactionType type,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end);

    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM BudgetItem b WHERE b.transactionType = 'INCOME'")
    BigDecimal calculateTotalIncome();

    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM BudgetItem b WHERE b.transactionType = 'EXPENSE'")
    BigDecimal calculateTotalExpenses();

    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM BudgetItem b WHERE b.transactionType = 'INCOME' " +
           "AND b.transactionDate BETWEEN :start AND :end")
    BigDecimal calculateIncomeForPeriod(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM BudgetItem b WHERE b.transactionType = 'EXPENSE' " +
           "AND b.transactionDate BETWEEN :start AND :end")
    BigDecimal calculateExpensesForPeriod(@Param("start") LocalDate start, @Param("end") LocalDate end);

    List<BudgetItem> findByRecurringTrue();

    @Query("SELECT b.category, SUM(b.amount) FROM BudgetItem b " +
           "WHERE b.transactionType = :type GROUP BY b.category")
    List<Object[]> sumByCategory(@Param("type") BudgetItem.TransactionType type);
}
