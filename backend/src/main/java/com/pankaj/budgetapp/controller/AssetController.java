package com.pankaj.budgetapp.controller;

import com.pankaj.budgetapp.entity.Asset;
import com.pankaj.budgetapp.service.AssetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/assets")
public class AssetController {

    private final AssetService assetService;

    @Autowired
    public AssetController(AssetService assetService) {
        this.assetService = assetService;
    }

    @GetMapping
    public ResponseEntity<List<Asset>> getAllAssets() {
        return ResponseEntity.ok(assetService.getAllAssets());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Asset> getAssetById(@PathVariable Long id) {
        return assetService.getAssetById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Asset> createAsset(@RequestBody Asset asset) {
        Asset created = assetService.createAsset(asset);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Asset> updateAsset(@PathVariable Long id, @RequestBody Asset asset) {
        try {
            Asset updated = assetService.updateAsset(id, asset);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAsset(@PathVariable Long id) {
        assetService.deleteAsset(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<List<Asset>> getAssetsByType(@PathVariable Asset.AssetType type) {
        return ResponseEntity.ok(assetService.findByType(type));
    }

    @GetMapping("/search")
    public ResponseEntity<List<Asset>> searchAssets(@RequestParam String query) {
        return ResponseEntity.ok(assetService.searchAssets(query));
    }

    @GetMapping("/location")
    public ResponseEntity<List<Asset>> getAssetsByLocation(@RequestParam String location) {
        return ResponseEntity.ok(assetService.findByLocation(location));
    }

    @PostMapping("/{id}/verify")
    public ResponseEntity<Asset> verifyAssetLocation(@PathVariable Long id) {
        try {
            Asset verified = assetService.verifyAssetLocation(id);
            return ResponseEntity.ok(verified);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/{id}/price")
    public ResponseEntity<Asset> updateMarketPrice(
            @PathVariable Long id,
            @RequestBody Map<String, BigDecimal> priceUpdate) {
        try {
            BigDecimal newPrice = priceUpdate.get("price");
            if (newPrice == null) {
                return ResponseEntity.badRequest().build();
            }
            Asset updated = assetService.updateMarketPrice(id, newPrice);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/stale")
    public ResponseEntity<List<Asset>> getStaleAssets() {
        return ResponseEntity.ok(assetService.getStaleAssets());
    }

    @GetMapping("/net-worth")
    public ResponseEntity<Map<String, BigDecimal>> getTotalNetWorth() {
        BigDecimal total = assetService.calculateTotalNetWorth();
        return ResponseEntity.ok(Map.of("totalNetWorth", total));
    }
}
