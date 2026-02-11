package com.pankaj.budgetapp.service;

import com.pankaj.budgetapp.entity.Asset;
import com.pankaj.budgetapp.repository.AssetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class AssetService {

    private final AssetRepository assetRepository;

    @Autowired
    public AssetService(AssetRepository assetRepository) {
        this.assetRepository = assetRepository;
    }

    public List<Asset> getAllAssets() {
        return assetRepository.findAll();
    }

    public Optional<Asset> getAssetById(Long id) {
        return assetRepository.findById(id);
    }

    public Asset createAsset(Asset asset) {
        asset.setCreatedAt(LocalDateTime.now());
        asset.setLastVerifiedDate(LocalDateTime.now());
        return assetRepository.save(asset);
    }

    public Asset updateAsset(Long id, Asset assetDetails) {
        return assetRepository.findById(id)
                .map(asset -> {
                    asset.setName(assetDetails.getName());
                    asset.setType(assetDetails.getType());
                    asset.setDescription(assetDetails.getDescription());
                    asset.setStorageLocation(assetDetails.getStorageLocation());
                    asset.setPurchasePrice(assetDetails.getPurchasePrice());
                    asset.setCurrentMarketPrice(assetDetails.getCurrentMarketPrice());
                    asset.setPurchaseDate(assetDetails.getPurchaseDate());
                    asset.setNotes(assetDetails.getNotes());
                    asset.setQuantity(assetDetails.getQuantity());
                    asset.setUnit(assetDetails.getUnit());
                    asset.setUpdatedAt(LocalDateTime.now());
                    return assetRepository.save(asset);
                })
                .orElseThrow(() -> new RuntimeException("Asset not found with id: " + id));
    }

    public void deleteAsset(Long id) {
        assetRepository.deleteById(id);
    }

    public List<Asset> findByType(Asset.AssetType type) {
        return assetRepository.findByType(type);
    }

    public List<Asset> searchAssets(String query) {
        return assetRepository.searchAssets(query);
    }

    public List<Asset> findByLocation(String location) {
        return assetRepository.findByStorageLocationContainingIgnoreCase(location);
    }

    // Verify location - updates lastVerifiedDate
    public Asset verifyAssetLocation(Long id) {
        return assetRepository.findById(id)
                .map(asset -> {
                    asset.setLastVerifiedDate(LocalDateTime.now());
                    return assetRepository.save(asset);
                })
                .orElseThrow(() -> new RuntimeException("Asset not found with id: " + id));
    }

    // Update market price for an asset
    public Asset updateMarketPrice(Long id, BigDecimal newPrice) {
        return assetRepository.findById(id)
                .map(asset -> {
                    asset.setCurrentMarketPrice(newPrice);
                    asset.setLastVerifiedDate(LocalDateTime.now());
                    return assetRepository.save(asset);
                })
                .orElseThrow(() -> new RuntimeException("Asset not found with id: " + id));
    }

    // Get stale assets (not verified in last 30 days)
    public List<Asset> getStaleAssets() {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(30);
        return assetRepository.findStaleAssets(cutoffDate);
    }

    // Calculate total net worth from all assets
    public BigDecimal calculateTotalNetWorth() {
        BigDecimal total = assetRepository.calculateTotalValue();
        return total != null ? total : BigDecimal.ZERO;
    }
}
