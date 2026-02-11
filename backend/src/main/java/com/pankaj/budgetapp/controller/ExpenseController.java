package com.pankaj.budgetapp.controller;

import com.pankaj.budgetapp.entity.Transaction;
import com.pankaj.budgetapp.repository.TransactionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/expenses")
@CrossOrigin(origins = "*")
public class ExpenseController {

    private final TransactionRepository transactionRepository;

    public ExpenseController(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    @GetMapping
    public ResponseEntity<List<Transaction>> getAllExpenses() {
        return ResponseEntity.ok(transactionRepository.findAllByOrderByDateDesc());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Transaction> getExpenseById(@PathVariable String id) {
        return transactionRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Transaction> createExpense(@RequestBody Map<String, Object> payload) {
        Transaction transaction = new Transaction();

        // Set ID (use provided or generate)
        String id = payload.get("id") != null ? payload.get("id").toString() : String.valueOf(System.currentTimeMillis());
        transaction.setId(id);

        // Set amount
        if (payload.get("amount") != null) {
            transaction.setAmount(new BigDecimal(payload.get("amount").toString()));
        }

        // Set category
        if (payload.get("category") != null) {
            transaction.setCategory(payload.get("category").toString());
        }

        // Set date
        if (payload.get("date") != null) {
            transaction.setDate(LocalDate.parse(payload.get("date").toString()));
        }

        // Set description
        if (payload.get("description") != null) {
            transaction.setDescription(payload.get("description").toString());
        }

        // Set currency
        if (payload.get("currency") != null) {
            transaction.setCurrency(payload.get("currency").toString());
        }

        // Set type
        if (payload.get("type") != null) {
            String typeStr = payload.get("type").toString().toUpperCase();
            transaction.setType(Transaction.TransactionType.valueOf(typeStr));
        }

        // Set recurringId
        if (payload.get("recurringId") != null) {
            transaction.setRecurringId(payload.get("recurringId").toString());
        }

        transaction.setCreatedAt(LocalDateTime.now());

        Transaction saved = transactionRepository.save(transaction);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Transaction> updateExpense(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        Optional<Transaction> existing = transactionRepository.findById(id);

        Transaction transaction = existing.orElse(new Transaction());
        transaction.setId(id);

        if (payload.get("amount") != null) {
            transaction.setAmount(new BigDecimal(payload.get("amount").toString()));
        }
        if (payload.get("category") != null) {
            transaction.setCategory(payload.get("category").toString());
        }
        if (payload.get("date") != null) {
            transaction.setDate(LocalDate.parse(payload.get("date").toString()));
        }
        if (payload.get("description") != null) {
            transaction.setDescription(payload.get("description").toString());
        }
        if (payload.get("currency") != null) {
            transaction.setCurrency(payload.get("currency").toString());
        }
        if (payload.get("type") != null) {
            String typeStr = payload.get("type").toString().toUpperCase();
            transaction.setType(Transaction.TransactionType.valueOf(typeStr));
        }

        transaction.setUpdatedAt(LocalDateTime.now());

        Transaction saved = transactionRepository.save(transaction);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExpense(@PathVariable String id) {
        if (transactionRepository.existsById(id)) {
            transactionRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/month/{year}/{month}")
    public ResponseEntity<List<Transaction>> getExpensesByMonth(@PathVariable int year, @PathVariable int month) {
        return ResponseEntity.ok(transactionRepository.findByYearAndMonth(year, month));
    }
}
