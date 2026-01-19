package com.example.budgetapp.controller;

import com.example.budgetapp.service.CurrencyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class CurrencyController {

    private final CurrencyService currencyService;

    public CurrencyController(CurrencyService currencyService) {
        this.currencyService = currencyService;
    }

    // GET /api/symbols
    @GetMapping("/symbols")
    public ResponseEntity<Map<String, String>> getSymbols() {
        return ResponseEntity.ok(currencyService.getSymbols());
    }

    // GET /api/rates?base=USD
    @GetMapping("/rates")
    public ResponseEntity<Map<String, Double>> getRates(@RequestParam(value = "base", defaultValue = "USD") String base) {
        return ResponseEntity.ok(currencyService.getLatestRates(base));
    }

    // GET /api/convert?from=USD&to=EUR&amount=100
    @GetMapping("/convert")
    public ResponseEntity<?> convert(@RequestParam String from,
                                     @RequestParam String to,
                                     @RequestParam double amount) {
        try {
            double result = currencyService.convert(from, to, amount);
            return ResponseEntity.ok(Map.of("from", from.toUpperCase(), "to", to.toUpperCase(), "amount", amount, "result", result));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }
}