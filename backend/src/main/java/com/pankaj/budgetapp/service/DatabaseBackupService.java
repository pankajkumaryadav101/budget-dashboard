package com.pankaj.budgetapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pankaj.budgetapp.entity.Asset;
import com.pankaj.budgetapp.entity.BudgetItem;
import com.pankaj.budgetapp.repository.AssetRepository;
import com.pankaj.budgetapp.repository.BudgetItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DatabaseBackupService {

    private final AssetRepository assetRepository;
    private final BudgetItemRepository budgetItemRepository;
    private final ObjectMapper objectMapper;

    private static final String BACKUP_DIRECTORY = System.getProperty("user.home") + "/budgetapp/backups/";

    @Autowired
    public DatabaseBackupService(AssetRepository assetRepository, BudgetItemRepository budgetItemRepository) {
        this.assetRepository = assetRepository;
        this.budgetItemRepository = budgetItemRepository;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    public String exportToJson() throws IOException {
        // Create backup directory if it doesn't exist
        Path backupPath = Paths.get(BACKUP_DIRECTORY);
        if (!Files.exists(backupPath)) {
            Files.createDirectories(backupPath);
        }

        // Get all data
        List<Asset> assets = assetRepository.findAll();
        List<BudgetItem> budgetItems = budgetItemRepository.findAll();

        // Create backup object
        Map<String, Object> backupData = new HashMap<>();
        backupData.put("exportDate", LocalDateTime.now().toString());
        backupData.put("version", "1.0");
        backupData.put("assets", assets);
        backupData.put("budgetItems", budgetItems);

        // Generate filename with timestamp
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String filename = "budget_backup_" + timestamp + ".json";
        String filepath = BACKUP_DIRECTORY + filename;

        // Write to file
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(new File(filepath), backupData);

        return filepath;
    }

    @Transactional
    public ImportResult importFromJson(String jsonContent) throws IOException {
        Map<String, Object> backupData = objectMapper.readValue(jsonContent, Map.class);

        int assetsImported = 0;
        int budgetItemsImported = 0;

        // Import assets
        if (backupData.containsKey("assets")) {
            List<Map<String, Object>> assetList = (List<Map<String, Object>>) backupData.get("assets");
            for (Map<String, Object> assetMap : assetList) {
                Asset asset = objectMapper.convertValue(assetMap, Asset.class);
                asset.setId(null); // Reset ID for new insert
                assetRepository.save(asset);
                assetsImported++;
            }
        }

        // Import budget items
        if (backupData.containsKey("budgetItems")) {
            List<Map<String, Object>> itemList = (List<Map<String, Object>>) backupData.get("budgetItems");
            for (Map<String, Object> itemMap : itemList) {
                BudgetItem item = objectMapper.convertValue(itemMap, BudgetItem.class);
                item.setId(null); // Reset ID for new insert
                budgetItemRepository.save(item);
                budgetItemsImported++;
            }
        }

        return new ImportResult(assetsImported, budgetItemsImported);
    }

    public List<String> listBackups() throws IOException {
        Path backupPath = Paths.get(BACKUP_DIRECTORY);
        if (!Files.exists(backupPath)) {
            return List.of();
        }

        return Files.list(backupPath)
                .filter(path -> path.toString().endsWith(".json"))
                .map(path -> path.getFileName().toString())
                .sorted()
                .toList();
    }

    public String readBackup(String filename) throws IOException {
        Path filePath = Paths.get(BACKUP_DIRECTORY + filename);
        return Files.readString(filePath);
    }

    public static class ImportResult {
        private int assetsImported;
        private int budgetItemsImported;

        public ImportResult(int assetsImported, int budgetItemsImported) {
            this.assetsImported = assetsImported;
            this.budgetItemsImported = budgetItemsImported;
        }

        public int getAssetsImported() { return assetsImported; }
        public int getBudgetItemsImported() { return budgetItemsImported; }
    }
}
