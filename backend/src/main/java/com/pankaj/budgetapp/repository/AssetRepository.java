package com.pankaj.budgetapp.repository;

import com.pankaj.budgetapp.entity.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Long> {

    List<Asset> findByType(Asset.AssetType type);

    List<Asset> findByStorageLocationContainingIgnoreCase(String location);

    List<Asset> findByNameContainingIgnoreCase(String name);

    @Query("SELECT a FROM Asset a WHERE a.lastVerifiedDate < :cutoffDate")
    List<Asset> findStaleAssets(@Param("cutoffDate") LocalDateTime cutoffDate);

    @Query("SELECT a FROM Asset a WHERE LOWER(a.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(a.storageLocation) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(a.description) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Asset> searchAssets(@Param("query") String query);

    @Query("SELECT COALESCE(SUM(CASE WHEN a.quantity IS NOT NULL AND a.quantity > 0 " +
           "THEN a.currentMarketPrice * a.quantity ELSE a.currentMarketPrice END), 0) FROM Asset a")
    java.math.BigDecimal calculateTotalValue();
}
