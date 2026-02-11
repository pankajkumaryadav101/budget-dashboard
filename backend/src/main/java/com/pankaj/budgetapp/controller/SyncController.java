package com.pankaj.budgetapp.controller;

import com.pankaj.budgetapp.entity.Transaction;
import com.pankaj.budgetapp.entity.UserSettings;
import com.pankaj.budgetapp.repository.TransactionRepository;
import com.pankaj.budgetapp.repository.UserSettingsRepository;
import com.pankaj.budgetapp.repository.AssetRepository;
import com.pankaj.budgetapp.entity.Asset;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/sync")
@CrossOrigin(origins = "*")
public class SyncController {

    private final TransactionRepository transactionRepository;
    private final UserSettingsRepository userSettingsRepository;
    private final AssetRepository assetRepository;

    public SyncController(TransactionRepository transactionRepository,
                         UserSettingsRepository userSettingsRepository,
                         AssetRepository assetRepository) {
        this.transactionRepository = transactionRepository;
        this.userSettingsRepository = userSettingsRepository;
        this.assetRepository = assetRepository;
    }

    /**
     * Get all data from backend to sync to frontend
     */
    @GetMapping("/pull")
    public ResponseEntity<Map<String, Object>> pullAllData() {
        Map<String, Object> data = new HashMap<>();

        // Get all transactions
        data.put("transactions", transactionRepository.findAllByOrderByDateDesc());

        // Get all assets
        data.put("assets", assetRepository.findAll());

        // Get all settings (budgets, salary, etc.)
        Map<String, String> settings = new HashMap<>();
        userSettingsRepository.findAll().forEach(s -> settings.put(s.getKey(), s.getValue()));
        data.put("settings", settings);

        data.put("syncedAt", LocalDateTime.now().toString());

        return ResponseEntity.ok(data);
    }

    /**
     * Push all localStorage data from frontend to backend
     */
    @PostMapping("/push")
    public ResponseEntity<Map<String, Object>> pushAllData(@RequestBody Map<String, Object> payload) {
        Map<String, Object> result = new HashMap<>();
        int transactionsSaved = 0;
        int assetsSaved = 0;
        int settingsSaved = 0;

        // Save transactions
        if (payload.get("transactions") != null) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> transactions = (List<Map<String, Object>>) payload.get("transactions");
            for (Map<String, Object> tx : transactions) {
                try {
                    Transaction transaction = mapToTransaction(tx);
                    transactionRepository.save(transaction);
                    transactionsSaved++;
                } catch (Exception e) {
                    System.err.println("Failed to save transaction: " + e.getMessage());
                }
            }
        }

        // Save monthly expenses (same as transactions)
        if (payload.get("monthlyExpenses") != null) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> expenses = (List<Map<String, Object>>) payload.get("monthlyExpenses");
            for (Map<String, Object> exp : expenses) {
                try {
                    Transaction transaction = mapToTransaction(exp);
                    // Check if already exists
                    if (!transactionRepository.existsById(transaction.getId())) {
                        transactionRepository.save(transaction);
                        transactionsSaved++;
                    }
                } catch (Exception e) {
                    System.err.println("Failed to save expense: " + e.getMessage());
                }
            }
        }

        // Save assets
        if (payload.get("assets") != null) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> assets = (List<Map<String, Object>>) payload.get("assets");
            for (Map<String, Object> assetData : assets) {
                try {
                    Asset asset = mapToAsset(assetData);
                    assetRepository.save(asset);
                    assetsSaved++;
                } catch (Exception e) {
                    System.err.println("Failed to save asset: " + e.getMessage());
                }
            }
        }

        // Save settings (budgets, salary, recurring reminders as JSON)
        String[] settingsKeys = {"budgets_v1", "user_salary_v1", "user_budget_v1", "recurring_reminders_v1",
                                 "user_annual_salary_v1", "user_salary_type_v1", "app_settings_v1"};
        for (String key : settingsKeys) {
            if (payload.get(key) != null) {
                try {
                    String value = payload.get(key) instanceof String
                        ? (String) payload.get(key)
                        : new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(payload.get(key));
                    UserSettings setting = new UserSettings(key, value);
                    userSettingsRepository.save(setting);
                    settingsSaved++;
                } catch (Exception e) {
                    System.err.println("Failed to save setting " + key + ": " + e.getMessage());
                }
            }
        }

        result.put("success", true);
        result.put("transactionsSaved", transactionsSaved);
        result.put("assetsSaved", assetsSaved);
        result.put("settingsSaved", settingsSaved);
        result.put("syncedAt", LocalDateTime.now().toString());

        return ResponseEntity.ok(result);
    }

    /**
     * Full sync - merge frontend and backend data
     */
    @PostMapping("/full")
    public ResponseEntity<Map<String, Object>> fullSync(@RequestBody Map<String, Object> payload) {
        // First push frontend data to backend
        pushAllData(payload);

        // Then pull all backend data
        return pullAllData();
    }

    private Transaction mapToTransaction(Map<String, Object> data) {
        Transaction tx = new Transaction();
        tx.setId(data.get("id") != null ? data.get("id").toString() : String.valueOf(System.currentTimeMillis()));

        if (data.get("amount") != null) {
            tx.setAmount(new BigDecimal(data.get("amount").toString()));
        }
        if (data.get("category") != null) {
            tx.setCategory(data.get("category").toString());
        }
        if (data.get("date") != null) {
            tx.setDate(LocalDate.parse(data.get("date").toString().substring(0, 10)));
        }
        if (data.get("description") != null) {
            tx.setDescription(data.get("description").toString());
        }
        if (data.get("currency") != null) {
            tx.setCurrency(data.get("currency").toString());
        }
        if (data.get("type") != null) {
            try {
                tx.setType(Transaction.TransactionType.valueOf(data.get("type").toString().toUpperCase()));
            } catch (Exception e) {
                tx.setType(Transaction.TransactionType.EXPENSE);
            }
        }
        if (data.get("recurringId") != null) {
            tx.setRecurringId(data.get("recurringId").toString());
        }
        tx.setCreatedAt(LocalDateTime.now());

        return tx;
    }

    private Asset mapToAsset(Map<String, Object> data) {
        Asset asset = new Asset();

        if (data.get("id") != null) {
            try {
                asset.setId(Long.parseLong(data.get("id").toString()));
            } catch (NumberFormatException e) {
                // ID will be auto-generated
            }
        }
        if (data.get("name") != null) {
            asset.setName(data.get("name").toString());
        }
        if (data.get("type") != null) {
            try {
                asset.setType(Asset.AssetType.valueOf(data.get("type").toString().toUpperCase()));
            } catch (Exception e) {
                asset.setType(Asset.AssetType.OTHER);
            }
        }
        if (data.get("description") != null) {
            asset.setDescription(data.get("description").toString());
        }
        if (data.get("storageLocation") != null) {
            asset.setStorageLocation(data.get("storageLocation").toString());
        }
        if (data.get("purchasePrice") != null) {
            asset.setPurchasePrice(new BigDecimal(data.get("purchasePrice").toString()));
        }
        if (data.get("currentMarketPrice") != null) {
            asset.setCurrentMarketPrice(new BigDecimal(data.get("currentMarketPrice").toString()));
        }

        return asset;
    }
}
