package com.pankaj.budgetapp.controller;

import com.pankaj.budgetapp.service.DatabaseBackupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/backup")
public class BackupController {

    private final DatabaseBackupService backupService;

    @Autowired
    public BackupController(DatabaseBackupService backupService) {
        this.backupService = backupService;
    }

    @PostMapping("/export")
    public ResponseEntity<Map<String, String>> exportDatabase() {
        try {
            String filepath = backupService.exportToJson();
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "filepath", filepath,
                    "message", "Database exported successfully"
            ));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "status", "error",
                    "message", "Export failed: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importDatabase(@RequestBody String jsonContent) {
        try {
            DatabaseBackupService.ImportResult result = backupService.importFromJson(jsonContent);
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "assetsImported", result.getAssetsImported(),
                    "budgetItemsImported", result.getBudgetItemsImported(),
                    "message", "Data imported successfully"
            ));
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", "Import failed: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/list")
    public ResponseEntity<List<String>> listBackups() {
        try {
            return ResponseEntity.ok(backupService.listBackups());
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(List.of());
        }
    }

    @GetMapping("/download/{filename}")
    public ResponseEntity<String> downloadBackup(@PathVariable String filename) {
        try {
            String content = backupService.readBackup(filename);
            return ResponseEntity.ok(content);
        } catch (IOException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
