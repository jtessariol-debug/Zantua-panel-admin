# LaserPanel - Firebase Auth Bootstrap

Sistema React + Firebase para gestion interna de Zantua Aesthetic Wellness.

## Arquitectura actual

- Frontend: React + `react-scripts`
- Auth: Firebase Auth
- Base de datos: Firestore
- Perfiles y roles: coleccion `users`
- Clientes: coleccion `clients`
- Sesiones y consentimientos: subcolecciones dentro de `clients`

## Flujo de login

El login permite:

- `username`, por ejemplo `anneris.owner`
- o email interno, por ejemplo `anneris.owner@zantua.internal`

Internamente:

- si escribes `anneris.owner`
- el sistema busca el perfil en Firestore
- resuelve el email interno
- autentica contra Firebase Auth usando email + contraseña

Si la cuenta no ha sido inicializada, el login muestra:

```txt
La cuenta aún no ha sido inicializada. Contacta al administrador o ejecuta el seed inicial.
```

## Seed seguro de usuarios iniciales

Los usuarios iniciales no se crean desde el frontend.

Se crean con `firebase-admin` desde un script de servidor:

```bash
npm run seed:users
```

Ese script:

- verifica si el usuario existe en Firebase Auth
- si no existe, lo crea
- si ya existe, lo actualiza
- crea o actualiza el perfil en Firestore
- deja `mustChangePassword: true`

## Variables de entorno necesarias

Copia `.env.example` a `.env` y completa:

```txt
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

SEED_USER_ANNERIS_PASSWORD=
SEED_USER_LEIDY_PASSWORD=
SEED_USER_MARJAN_PASSWORD=
SEED_USER_RUT_PASSWORD=
```

Para las contraseñas temporales pedidas:

```txt
SEED_USER_ANNERIS_PASSWORD=Zantua#ANR84vQ!
SEED_USER_LEIDY_PASSWORD=Zantua#LH29mX!
SEED_USER_MARJAN_PASSWORD=Zantua#MP63kT!
SEED_USER_RUT_PASSWORD=Zantua#RV51qB!
```

## Usuarios creados por el seed

- `anneris.owner`
- `leidy.hernandez`
- `marjan.pena`
- `rut.vericut`

Emails internos:

- `anneris.owner@zantua.internal`
- `leidy.hernandez@zantua.internal`
- `marjan.pena@zantua.internal`
- `rut.vericut@zantua.internal`

## Crear usuarios iniciales

1. Configura `src/firebase/config.js` con el proyecto real de Firebase
2. Crea `.env` con las variables necesarias
3. Ejecuta:

```bash
npm install
npm run seed:users
```

## Probar login de Anneris

1. Ejecuta el seed
2. Inicia la app:

```bash
npm start
```

3. En el login usa:

```txt
Usuario: anneris.owner
Contraseña: la definida en SEED_USER_ANNERIS_PASSWORD
```

4. El sistema autentica con Firebase Auth y resuelve el rol desde Firestore

## Verificar en Firebase Auth

En Firebase Console:

1. Ve a `Authentication`
2. Abre `Users`
3. Debes ver:
   - `anneris.owner@zantua.internal`
   - `leidy.hernandez@zantua.internal`
   - `marjan.pena@zantua.internal`
   - `rut.vericut@zantua.internal`

## Verificar perfil y rol en Firestore

En Firebase Console:

1. Ve a `Firestore Database`
2. Abre la coleccion `users`
3. Verifica que cada documento tenga:
   - `name`
   - `username`
   - `email`
   - `role`
   - `active`
   - `mustChangePassword`

## Cambio obligatorio de contraseña

Si `mustChangePassword` es `true`, la app obliga al cambio de contraseña al iniciar sesion.

## Archivos principales

- `src/hooks/useAuth.js`
- `src/services/users.js`
- `src/lib/auth.js`
- `src/pages/Login.jsx`
- `src/pages/Dashboard.jsx`
- `scripts/seed-users.js`
- `.env.example`
- `src/firebase/config.js`
- `firestore.rules`
