package com.pankaj.budgetapp.repository;

import com.pankaj.budgetapp.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, String> {

    List<Transaction> findByDateBetween(LocalDate start, LocalDate end);

    List<Transaction> findByCategory(String category);

    List<Transaction> findByType(Transaction.TransactionType type);

    @Query("SELECT t FROM Transaction t WHERE YEAR(t.date) = ?1 AND MONTH(t.date) = ?2")
    List<Transaction> findByYearAndMonth(int year, int month);

    List<Transaction> findAllByOrderByDateDesc();
}
