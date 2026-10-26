# UniShare - Plataforma Colaborativa Universitaria

Plataforma móvil colaborativa para el préstamo e intercambio de objetos en la comunidad universitaria.

---

## 1. Estructura del Repositorio

```text
unishare/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # Pool de conexiones PostgreSQL ('pg')
│   │   ├── controllers/              # Controladores (lógica de negocio)
│   │   ├── middlewares/              # Middlewares (auth, errorHandler, etc.)
│   │   ├── routes/                   # Definición modular de endpoints Express
│   │   ├── db/
│   │   │   └── schema.sql            # Script SQL DDL con restricciones y relaciones
│   │   ├── services/                 # Servicios y casos de uso
│   │   ├── utils/                    # Funciones utilitarias
│   │   ├── app.js                    # Configuración de Express, CORS y Middlewares
│   │   └── server.js                 # Inicialización y arranque del servidor HTTP
│   ├── .env.example                  # Plantilla de variables de entorno
│   ├── .gitignore
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── constants/
    │   │   ├── colors.js             # Paleta corporativa "Eucalipto" y semántica
    │   │   └── theme.js              # Espaciados, tipografías y sombras
    │   ├── components/
    │   │   ├── common/               # Botones, inputs, badges, tarjetas
    │   │   └── layout/               # Headers, safe area, tab bars
    │   ├── screens/                  # Vistas categorizadas por flujo funcional
    │   │   ├── auth/
    │   │   ├── items/
    │   │   ├── requests/
    │   │   └── profile/
    │   ├── navigation/               # Stacks y Bottom Tabs de React Navigation
    │   └── services/
    │       └── api.js                # Cliente HTTP para conexión con Backend
    ├── App.js                        # Entrada principal de la aplicación Expo
    ├── app.json                      # Configuración del ecosistema Expo
    ├── .gitignore
    └── package.json
```

---

## 2. Paleta Corporativa "Eucalipto"

| Token | Hex | Aplicación |
|---|---|---|
| **Verde Oscuro** | `#233B32` | Color Principal / Barra de Navegación / Botones de acción primaria |
| **Verde Medio** | `#4C7A66` | Acentos / Acciones secundarias / Iconos activos |
| **Verde Claro** | `#8FBBA6` | Badges / Estados / Etiquetas informativas |
| **Fondo Claro** | `#DDEEE3` | Fondo de pantallas / Tarjetas destacadas / Superficies |
