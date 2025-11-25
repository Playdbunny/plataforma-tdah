# SynapQuest

## 👥 Integrantes
- Javiera Bustamante  
- Franco Constanzo  
- Fernanda Marín  

---

## 📚 ¿De qué se trata SynapQuest?
SynapQuest es una plataforma en línea que permite a estudiantes con diagnóstico de TDAH aprender de manera personalizada, acorde a sus necesidades.
El propósito es mejorar la atención y el desempeño académico ajustando los contenidos, sosteniendo el interés con gamificación y proporcionando informes de progreso.
> 🧑‍🎓 **Importante:** SynapQuest está diseñado como una herramienta de apoyo para los estudiantes, enfocada en el aprendizaje autónomo, y no como una plataforma para que profesores impartan clases.

---

## 📆 Estado actual del proyecto:  
🟡 En proceso/Desarrollo

---

## 📎 Enlaces Importantes
- 📂 [Carpeta OneDrive del Proyecto](https://duoccl0-my.sharepoint.com/:f:/g/personal/fern_marin_duocuc_cl/EhsV9XinkHBAtZarUwyhHHoB36Hf3NnAKVcGf_oNenDvTw?e=79oKTv)  
- 💻 [Repositorio en GitHub](https://github.com/Playdbunny/plataforma-tdah)  
- 📌 [Tablero de Gestión (Trello)](https://trello.com/invite/b/68ae70cd449318426dc8f72e/ATTI5df8a3b36e4a26b0c7cc05e2c899d074ADAB78DB/capstone-synapquest-scrum)
  
---

## 🚀 Tecnologías principales
- **Frontend:** React + Vite + TypeScript  
- **Backend:** Node.js / Express
- **Base de Datos:** MongoDB
- **Gestión de proyecto:** Scrum con Sprints  
<!-- - **Machine Learning:** TensorFlow / Scikit-learn-->

---

## ⚙️ Cómo iniciar el proyecto en local

### 🔹 Backend

1. Crear un archivo **.env** basandose en el archivo de ejemplo **.env.example**.
2. En la terminal poner estos comandos uno por uno
```bash
cd Proyecto/backend
npm install
npm install google-auth-library
npm install nodemailer
npm run dev
```
> El backend quedará corriendo en http://127.0.0.1:4000.

> En Google Cloud Console → OAuth → **Authorized redirect URIs**, registra exactamente `http://127.0.0.1:4000/api/auth/google/callback`.
> Evita mezclar `localhost` y `127.0.0.1` en el flujo de OAuth: usa siempre `127.0.0.1` en las variables de entorno y en Google Cloud.

### 🔐 Cambios rápidos de seguridad aplicados

Hemos aplicado varias mejoras de seguridad rápidas en el backend para reducir riesgos inmediatos:
- `helmet` — añade cabeceras HTTP seguras (HSTS, CSP básicos).
- `express-mongo-sanitize` — evita inyección de operadores Mongo (p.ej. `$gt`).
- `express-rate-limit` — límites en endpoints sensibles (`/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/refresh`).

Cómo probar localmente:
- Comprobar cabeceras de seguridad (HSTS/CSP):
```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:4000/api/health' -Method Head | Select-Object -ExpandProperty Headers
```
- Probar rate-limit en `login` (tras varios intentos verás 429 o el mensaje JSON):
```powershell
1..10 | ForEach-Object {
  try {
    Invoke-RestMethod -Uri 'http://127.0.0.1:4000/api/auth/login' -Method Post `
      -Body (@{ email='no@no.com'; password='x' } | ConvertTo-Json) -ContentType 'application/json'
  } catch {
    Write-Host "Error:" $_.Exception.Response.StatusCode.Value__ $_.Exception.Message
  }
}
```
- Probar sanitización Mongo (payload con operadores):
```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:4000/api/auth/login' -Method Post `
  -Body (@{ email = @{ '$gt' = '' }; password='x' } | ConvertTo-Json -Depth 5) -ContentType 'application/json'
```

Si quieres que revertamos alguno de estos cambios o los ajustemos (p.ej. reglas CSP más estrictas), dímelo y lo adapto.

### 🔹 Frontend

1. Crear un archivo **.env** basandose en el archivo de ejemplo **.env.example**.
> Asegurarse de que esté la URL correcta del backend (http://127.0.0.1:4000).
2. En la terminal poner estos comandos uno por uno
```bash
cd Proyecto/frontend
npm install
npm install axios
npm run dev
```
> El frontend quedará en http://127.0.0.1:5173.

## 🧩 Activity model & API (CRUD + validation)
### 🔹 Backend

* Modelo Activity

  subjectId: ObjectId — Referencia a la materia
  title: String — Título de la actividad
  slug: String — Identificador único por materia
  templateType: String — Tipo de plantilla (quiz, video, ppt, etc.)
  fieldsJSON: Object — Estructura variable según el tipo de actividad
  status: "draft" | "published"
  createdBy: ObjectId — Usuario creador
  createdAt, updatedAt: Date

* Endpoints

 1. Crear actividad
   
   * POST /admin/activities
   * Headers: Authorization: Bearer <token>
   * Body (JSON):
     {
      "subjectId": "652e1b1234567890abcdef12",
      "title": "Quiz de Matemáticas",
      "slug": "quiz-matematicas",
      "templateType": "quiz",
      "fieldsJSON": { "questions": [] },
      "status": "draft",
      "createdBy": "652e1b1234567890abcdef12"
     }

 2. Listar actividades
   
   * GET /admin/activities
   * Headers: Authorization: Bearer <token>
   * Respuesta: Array de actividades

 3. Actualizar actividades

   * PUT /admin/activities/:id
   * Headers: Authorization: Bearer <token>
   * Body: Campos actualizar 
   * Respuesta: Actividad actualizada

 4. Eliminar actividad 

   * DELETE /admin/activities/:id
   * Headers: Authorization: Bear <token>
   * Respuesta: {"message": "Actividad eliminada."}

* Errores comunes

 - 401 Unauthorized: Token faltantes o invalido
 - 403 Forbidden: Usuario sin permisos de admin
 - 422 Unprocessable Entity: Datos invalidos o slug repetido
 - 404 Not Found: Actividad no encontrada