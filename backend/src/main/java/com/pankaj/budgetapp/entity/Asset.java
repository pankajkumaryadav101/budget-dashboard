package com.pankaj.budgetapp.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "assets")
public class Asset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AssetType type;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private String storageLocation;

    @Column(precision = 19, scale = 4)
    private BigDecimal purchasePrice;

    @Column(precision = 19, scale = 4)
    private BigDecimal currentMarketPrice;

    private LocalDateTime purchaseDate;

    @Column(nullable = false)
    private LocalDateTime lastVerifiedDate;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @Column(length = 1000)
    private String notes;

    // Quantity (useful for gold in grams, etc.)
    @Column(precision = 19, scale = 4)
    private BigDecimal quantity;

    private String unit; // grams, pieces, sqft, etc.

    @Transient
    private boolean stale;

    public enum AssetType {
        LAND,
        GOLD,
        CAR,
        REAL_ESTATE,
        JEWELRY,
        ELECTRONICS,
        DOCUMENTS,
        CASH,
        OTHER
    }

    public Asset() {
        this.createdAt = LocalDateTime.now();
        this.lastVerifiedDate = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public AssetType getType() {
        return type;
    }

    public void setType(AssetType type) {
        this.type = type;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStorageLocation() {
        return storageLocation;
    }

    public void setStorageLocation(String storageLocation) {
        this.storageLocation = storageLocation;
    }

    public BigDecimal getPurchasePrice() {
        return purchasePrice;
    }

    public void setPurchasePrice(BigDecimal purchasePrice) {
        this.purchasePrice = purchasePrice;
    }

    public BigDecimal getCurrentMarketPrice() {
        return currentMarketPrice;
    }

    public void setCurrentMarketPrice(BigDecimal currentMarketPrice) {
        this.currentMarketPrice = currentMarketPrice;
    }

    public LocalDateTime getPurchaseDate() {
        return purchaseDate;
    }

    public void setPurchaseDate(LocalDateTime purchaseDate) {
        this.purchaseDate = purchaseDate;
    }

    public LocalDateTime getLastVerifiedDate() {
        return lastVerifiedDate;
    }

    public void setLastVerifiedDate(LocalDateTime lastVerifiedDate) {
        this.lastVerifiedDate = lastVerifiedDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public void setQuantity(BigDecimal quantity) {
        this.quantity = quantity;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public boolean isStale() {
        return lastVerifiedDate != null &&
               lastVerifiedDate.isBefore(LocalDateTime.now().minusDays(30));
    }

    public void setStale(boolean stale) {
        this.stale = stale;
    }

    // Calculate total value
    public BigDecimal getTotalValue() {
        if (currentMarketPrice == null) {
            return BigDecimal.ZERO;
        }
        if (quantity != null && quantity.compareTo(BigDecimal.ZERO) > 0) {
            return currentMarketPrice.multiply(quantity);
        }
        return currentMarketPrice;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
