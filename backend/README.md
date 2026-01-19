# Budget Backend (Spring Boot)

Provides currency symbols, latest exchange rates, and a convert endpoint using exchangerate.host.

Endpoints:
- GET /api/symbols
- GET /api/rates?base=USD
- GET /api/convert?from=USD&to=EUR&amount=100

Run locally:
- mvn -f backend clean package
- java -jar backend/target/budget-backend-0.0.1-SNAPSHOT.jar

Notes:
- Rates are fetched from https://api.exchangerate.host and cached in memory.
- The scheduled fetch runs every 60s to keep rates interactive.