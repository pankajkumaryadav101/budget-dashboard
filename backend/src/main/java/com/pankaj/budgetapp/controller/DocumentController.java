package com.pankaj.budgetapp.controller;

import com.pankaj.budgetapp.service.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    @Autowired
    private FileStorageService fileStorageService;

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            String fileName = fileStorageService.storeFile(file);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("fileName", fileName);
            response.put("originalName", file.getOriginalFilename());
            response.put("size", file.getSize());
            response.put("contentType", file.getContentType());

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Failed to upload file: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/download/{fileName}")
    public ResponseEntity<byte[]> downloadFile(@PathVariable String fileName) {
        try {
            byte[] data = fileStorageService.loadFile(fileName);
            String contentType = fileStorageService.getContentType(fileName);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(data);
        } catch (IOException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/view/{fileName}")
    public ResponseEntity<byte[]> viewFile(@PathVariable String fileName) {
        try {
            byte[] data = fileStorageService.loadFile(fileName);
            String contentType = fileStorageService.getContentType(fileName);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(data);
        } catch (IOException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{fileName}")
    public ResponseEntity<Map<String, Object>> deleteFile(@PathVariable String fileName) {
        try {
            fileStorageService.deleteFile(fileName);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "File deleted successfully");

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Failed to delete file: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/storage-info")
    public ResponseEntity<Map<String, Object>> getStorageInfo() {
        Map<String, Object> info = new HashMap<>();
        info.put("uploadDir", fileStorageService.getUploadDir());
        return ResponseEntity.ok(info);
    }
}
