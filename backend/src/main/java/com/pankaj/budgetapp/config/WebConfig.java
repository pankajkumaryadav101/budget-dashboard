package com.pankaj.budgetapp.config;

import org.springframework.context.annotation.Configuration;

@Configuration
public class WebConfig {
    // CORS is configured globally in `GlobalCorsConfig`.
    // Keeping a second CORS configuration here caused an exception when credentials are enabled.
}
