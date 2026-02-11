package com.pankaj.budgetapp.service;

import com.pankaj.budgetapp.entity.Asset;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
public class NotificationService {

    private final AssetService assetService;

    @Autowired
    public NotificationService(AssetService assetService) {
        this.assetService = assetService;
    }

    public List<Reminder> getReminders() {
        List<Reminder> reminders = new ArrayList<>();
        List<Asset> staleAssets = assetService.getStaleAssets();

        for (Asset asset : staleAssets) {
            long daysSinceVerification = ChronoUnit.DAYS.between(
                    asset.getLastVerifiedDate(), LocalDateTime.now());

            ReminderType type;
            String priority;
            if (daysSinceVerification > 90) {
                type = ReminderType.CRITICAL;
                priority = "HIGH";
            } else if (daysSinceVerification > 60) {
                type = ReminderType.WARNING;
                priority = "MEDIUM";
            } else {
                type = ReminderType.INFO;
                priority = "LOW";
            }

            reminders.add(new Reminder(
                    asset.getId(),
                    asset.getName(),
                    asset.getType().name(),
                    asset.getStorageLocation(),
                    generateMessage(asset, daysSinceVerification),
                    type,
                    priority,
                    daysSinceVerification,
                    needsPriceUpdate(asset),
                    needsLocationVerification(asset)
            ));
        }

        return reminders;
    }

    private String generateMessage(Asset asset, long daysSince) {
        StringBuilder msg = new StringBuilder();
        msg.append("'").append(asset.getName()).append("' ");
        msg.append("hasn't been verified in ").append(daysSince).append(" days. ");

        if (asset.getCurrentMarketPrice() == null || asset.getCurrentMarketPrice().signum() == 0) {
            msg.append("Price update needed. ");
        }

        msg.append("Location: ").append(asset.getStorageLocation());
        return msg.toString();
    }

    private boolean needsPriceUpdate(Asset asset) {
        return asset.getCurrentMarketPrice() == null ||
               asset.getCurrentMarketPrice().signum() == 0 ||
               asset.isStale();
    }

    private boolean needsLocationVerification(Asset asset) {
        return asset.isStale();
    }

    public static class Reminder {
        private Long assetId;
        private String assetName;
        private String assetType;
        private String storageLocation;
        private String message;
        private ReminderType type;
        private String priority;
        private long daysSinceVerification;
        private boolean needsPriceUpdate;
        private boolean needsLocationVerification;

        public Reminder(Long assetId, String assetName, String assetType, String storageLocation,
                        String message, ReminderType type, String priority, long daysSinceVerification,
                        boolean needsPriceUpdate, boolean needsLocationVerification) {
            this.assetId = assetId;
            this.assetName = assetName;
            this.assetType = assetType;
            this.storageLocation = storageLocation;
            this.message = message;
            this.type = type;
            this.priority = priority;
            this.daysSinceVerification = daysSinceVerification;
            this.needsPriceUpdate = needsPriceUpdate;
            this.needsLocationVerification = needsLocationVerification;
        }

        // Getters
        public Long getAssetId() { return assetId; }
        public String getAssetName() { return assetName; }
        public String getAssetType() { return assetType; }
        public String getStorageLocation() { return storageLocation; }
        public String getMessage() { return message; }
        public ReminderType getType() { return type; }
        public String getPriority() { return priority; }
        public long getDaysSinceVerification() { return daysSinceVerification; }
        public boolean isNeedsPriceUpdate() { return needsPriceUpdate; }
        public boolean isNeedsLocationVerification() { return needsLocationVerification; }
    }

    public enum ReminderType {
        INFO,
        WARNING,
        CRITICAL
    }
}
