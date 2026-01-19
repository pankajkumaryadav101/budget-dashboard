package com.pankaj.budgetapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.annotation.PostConstruct;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Service
public class CurrencyService {

    private final RestTemplate rest = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    private Map<String, String> symbols = Collections.synchronizedMap(new HashMap<>());
    private Map<String, Double> latestRates = Collections.synchronizedMap(new HashMap<>());
    private String base = "USD";
    private long lastFetched = 0L;

    @PostConstruct
    public void init() {
        fetchSymbols();
        fetchLatestRates(base);
    }

    // refresh symbols once a day
    @Scheduled(cron = "0 0 2 * * *")
    public void scheduledFetchSymbols() {
        fetchSymbols();
    }

    // every 60 seconds for interactive fresh rates
    @Scheduled(fixedRate = 60 * 1000)
    public void scheduledFetchRates() {
        fetchLatestRates(base);
    }

    public Map<String, String> getSymbols() {
        return symbols;
    }

    public Map<String, Double> getLatestRates(String baseCurrency) {
        if (!baseCurrency.equalsIgnoreCase(base) || (System.currentTimeMillis() - lastFetched) > 30 * 1000) {
            fetchLatestRates(baseCurrency);
        }
        if (!baseCurrency.equalsIgnoreCase(base)) {
            Double baseRate = latestRates.get(baseCurrency.toUpperCase());
            if (baseRate == null || baseRate == 0) {
                return latestRates;
            }
            Map<String, Double> adjusted = new HashMap<>();
            for (Map.Entry<String, Double> e : latestRates.entrySet()) {
                adjusted.put(e.getKey(), e.getValue() / baseRate);
            }
            return adjusted;
        }
        return latestRates;
    }

    public double convert(String from, String to, double amount) {
        from = from.toUpperCase();
        to = to.toUpperCase();
        fetchLatestRates(base);
        Double fromRate = latestRates.get(from);
        Double toRate = latestRates.get(to);
        if (fromRate == null || toRate == null) {
            throw new IllegalArgumentException("Unknown currency code");
        }
        return amount / fromRate * toRate;
    }

    private void fetchSymbols() {
        try {
            String url = "https://api.exchangerate.host/symbols";
            String resp = rest.getForObject(url, String.class);
            JsonNode root = mapper.readTree(resp);
            JsonNode symbolsNode = root.path("symbols");
            Map<String, String> map = new HashMap<>();
            symbolsNode.fieldNames().forEachRemaining(code -> {
                JsonNode node = symbolsNode.path(code);
                String desc = node.path("description").asText();
                map.put(code, desc);
            });
            this.symbols = map;
        } catch (Exception ex) {
            System.err.println("Failed to fetch symbols: " + ex.getMessage());
        }
    }

    private void fetchLatestRates(String baseCurrency) {
        try {
            String url = "https://api.exchangerate.host/latest?base=" + baseCurrency.toUpperCase();
            String resp = rest.getForObject(url, String.class);
            JsonNode root = mapper.readTree(resp);
            JsonNode ratesNode = root.path("rates");
            Map<String, Double> map = new HashMap<>();
            ratesNode.fieldNames().forEachRemaining(code -> {
                double v = ratesNode.path(code).asDouble();
                map.put(code, v);
            });
            this.latestRates = map;
            this.base = baseCurrency.toUpperCase();
            this.lastFetched = System.currentTimeMillis();
        } catch (Exception ex) {
            System.err.println("Failed to fetch rates: " + ex.getMessage());
        }
    }
}