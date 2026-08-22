# Gold Continent

El sistema se ejecuta como tres aplicaciones independientes:

- `frontend`: Next.js + React + Tailwind CSS en `http://localhost:3000`.
- `backend`: API Express en `http://localhost:3001`.
- `ia`: recomendador Python en `http://localhost:5000`.

## Desarrollo

Abre dos terminales desde la raíz del proyecto.

### Backend

```powershell
cd backend
npm install
npm run dev
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Accede a `http://localhost:3000`.

## Variables de entorno

Copia `backend/.env.example` como `backend/.env` y completa las credenciales. El origen del frontend debe ser:

```env
PORT=3001
CLIENT_URL=http://localhost:3000
```

Para apuntar el frontend a una API externa, copia `frontend/.env.example` como `frontend/.env` y configura `NEXT_PUBLIC_API_URL`.

La interfaz usa DM Sans como tipografía global y `lucide-react` para su sistema de iconos.

## Producción local

```powershell
cd frontend
npm run build
npm start
```

La API continúa ejecutándose por separado desde `backend` con `npm start`.
