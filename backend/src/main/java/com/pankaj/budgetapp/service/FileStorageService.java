package com.pankaj.budgetapp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${file.upload-dir:${user.home}/budgetapp/documents}")
    private String uploadDir;

    public String storeFile(MultipartFile file) throws IOException {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadPath);

        // Generate unique filename
        String originalFileName = file.getOriginalFilename();
        String extension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }
        String fileName = UUID.randomUUID().toString() + extension;

        Path targetPath = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        return fileName;
    }

    public byte[] loadFile(String fileName) throws IOException {
        Path filePath = Paths.get(uploadDir).resolve(fileName).normalize();
        if (!Files.exists(filePath)) {
            throw new IOException("File not found: " + fileName);
        }
        return Files.readAllBytes(filePath);
    }

    public void deleteFile(String fileName) throws IOException {
        Path filePath = Paths.get(uploadDir).resolve(fileName).normalize();
        Files.deleteIfExists(filePath);
    }

    public String getUploadDir() {
        return uploadDir;
    }

    public long getFileSize(String fileName) throws IOException {
        Path filePath = Paths.get(uploadDir).resolve(fileName).normalize();
        return Files.size(filePath);
    }

    public String getContentType(String fileName) throws IOException {
        Path filePath = Paths.get(uploadDir).resolve(fileName).normalize();
        String contentType = Files.probeContentType(filePath);
        return contentType != null ? contentType : "application/octet-stream";
    }
}
