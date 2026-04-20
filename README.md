# Property Manager (C# + React)

Starter project with:
- Backend: ASP.NET Core Web API (.NET 10) + JWT auth
- Frontend: React + TypeScript + Vite
- Data: in-memory seed data (temporary, no PostgreSQL required yet)

## Project structure

- `backend/PropertyManager.sln`
- `backend/PropertyManager.Api`
- `frontend/property-manager-web`

## Run backend

```powershell
cd C:\Users\iksas\Desktop\property-manager\backend\PropertyManager.Api
dotnet run
```

Backend URL (default): `http://localhost:5076`

## Run frontend

```powershell
cd C:\Users\iksas\Desktop\property-manager\frontend\property-manager-web
npm run dev
```

Frontend URL (default): `http://localhost:5173`

## Demo login

- Email: `resident@local.test`
- Password: `Password123!`

Also available:
- Email: `admin@local.test`
- Password: `Password123!`

## Notes

- API uses JWT and CORS is configured for `http://localhost:5173`.
- Frontend API base URL defaults to `http://localhost:5076/api`.
- Later we can replace in-memory data with PostgreSQL + EF Core without changing frontend contract.
