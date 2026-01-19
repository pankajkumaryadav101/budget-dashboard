# budget-dashboard

Interactive Budget Dashboard (React + Spring Boot)

- Dark theme with black/red/white palette
- Live currency rates via exchangerate.host
- English + हिंदी (react-i18next)
- LocalStorage persistence for budgets and transactions
- No CI/CD included (local-only)

Run backend:
1. mvn -f backend clean package
2. java -jar backend/target/budget-backend-0.0.1-SNAPSHOT.jar

Run frontend:
1. cd frontend
2. npm install
3. npm start

Backend runs on port 8080 and frontend on 3000.
To change backend URL set REACT_APP_BACKEND_URL in frontend/.env (for example: REACT_APP_BACKEND_URL=http://localhost:8080)

License / Copyright:
Copyright (c) 2026 Pankaj
All rights reserved.