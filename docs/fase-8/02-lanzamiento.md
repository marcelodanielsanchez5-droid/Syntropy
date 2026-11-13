# Fase 8 · Lista para el lanzamiento

Pasos para publicar Syntropy como app web instalable (PWA). Las tiendas de Android e iOS quedan para después (sección 9). Ningún paso se hizo todavía: todos necesitan las cuentas y los datos del responsable.

Marcar cada casilla al completarla.

---

## 1. Responsable y textos legales

- [ ] Definir quién es el responsable (persona o razón social), su correo de contacto y su domicilio.
- [ ] Cargar `VITE_LEGAL_OWNER`, `VITE_LEGAL_CONTACT_EMAIL` y `VITE_LEGAL_LOCATION` en el hosting. Comprobar que `/legal/terminos` y `/legal/privacidad` ya no muestran «[dato pendiente]».
- [ ] **Revisión de los textos por un profesional** de la jurisdicción (decisión D29). Si cambia algo relevante, subir la versión en `src/features/legal/legal-versions.ts` y en `current_legal_versions()` con una migración nueva.
- [ ] Consultar con el profesional la inscripción de la base de datos en el Registro Nacional de Bases de Datos de la Agencia de Acceso a la Información Pública.
- [ ] Crear el buzón del correo de contacto y decidir quién responde los pedidos sobre datos (plazos: 10 días corridos para acceso, 5 días hábiles para rectificación o supresión).

## 2. Supabase

- [ ] Proyecto de producción en la región más cercana a los usuarios (por ejemplo, São Paulo).
- [ ] Aplicar las migraciones `001` a `006` en orden (guía: [`08-configuracion-supabase.md`](../fase-1/08-configuracion-supabase.md)).
- [ ] Revisar el plan (verificar las condiciones vigentes en la página de precios): el gratuito pausa el proyecto tras una semana sin actividad y no incluye copias de seguridad diarias. Para usuarios reales conviene el plan pago, o al menos un respaldo manual programado.
- [ ] Probar el aislamiento con dos cuentas (checklist del README).

## 3. Correo

- [ ] **SMTP propio** para los correos de la cuenta (confirmación y recuperación). El SMTP incluido en Supabase es solo para pruebas y tiene un límite muy bajo por hora. Se puede usar el mismo dominio de Resend.
- [ ] Plantillas de correo de Auth traducidas al español.
- [ ] Dominio verificado en Resend (SPF y DKIM) y, si se puede, un registro DMARC.
- [ ] Recordatorios: secretos, despliegue de `send-reminders` y `programar-recordatorios.sql` ([`docs/fase-7/README.md`](../fase-7/README.md#4-puesta-en-marcha)).
- [ ] Comprobar que la confirmación, la recuperación y un recordatorio llegan a la bandeja de entrada en Gmail y Outlook.

## 4. Auth

- [ ] `Site URL` y URLs de redirección con el dominio final.
- [ ] Confirmación de correo obligatoria.
- [ ] CAPTCHA en el registro y el ingreso (Supabase admite hCaptcha y Cloudflare Turnstile), para frenar cuentas automáticas.
- [ ] Revisar los límites de intentos de Auth.

## 5. Hosting

- [ ] Elegir un hosting de sitios estáticos con HTTPS (Cloudflare Pages, Netlify, Vercel u otro).
- [ ] Comando de build `npm run build`, carpeta `dist`.
- [ ] Redirigir todas las rutas a `index.html` (la app usa rutas del navegador). En Netlify y Cloudflare Pages, un archivo `public/_redirects` con `/* /index.html 200`; en Vercel, una regla de `rewrites`.
- [ ] Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`, `VITE_APP_ENV=production` y las tres `VITE_LEGAL_*`. **Nunca** la `service_role`.
- [ ] Dominio propio y cabeceras de seguridad (`Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`).

## 6. Calidad

- [ ] `npm run typecheck`, `npm test` y `npm run build` sin errores.
- [ ] Validar las fases 3 a 8 contra el proyecto real (pasos del README).
- [ ] Pruebas con estudiantes y corrección de los hallazgos críticos y altos ([`01-plan-de-pruebas.md`](./01-plan-de-pruebas.md)).
- [ ] Probar en Chrome y Safari de celular, y en Chrome, Edge, Firefox y Safari de computadora.
- [ ] Instalar la PWA en Android e iOS y abrirla sin conexión.
- [ ] Lighthouse en inicio, calendario y configuración.
- [ ] Revisar los avisos de `npm audit` (hoy son de herramientas de desarrollo).

## 7. Operación

- [ ] Quién mira los registros de Supabase y las ejecuciones de pg_cron (y cada cuánto).
- [ ] Respaldo probado: restaurar una copia en un proyecto aparte al menos una vez.
- [ ] Plan ante incidentes: quién decide, cómo se avisa a los usuarios por correo (lo promete la política de privacidad) y cómo se rotan las claves.
- [ ] Revisar el uso de las cuotas gratuitas (Storage, correos de Resend, filas) una vez por semana el primer mes.

## 8. Publicación

- [ ] Desplegar y hacer una prueba rápida: registro, asignatura, tarea, recordatorio de prueba, descarga de datos y borrado de cuenta.
- [ ] Reemplazar el logo provisional (D10) y los íconos de la PWA.
- [ ] Avisar a los participantes de las pruebas.
- [ ] Abrir un canal para recibir comentarios (por ejemplo, el correo de contacto).

## 9. Después del lanzamiento

- Empaquetado para Windows (Tauri) y para Android e iOS (Capacitor), con su propia revisión de políticas de cada tienda.
- Plan de mejoras: [`03-mejoras-futuras.md`](./03-mejoras-futuras.md).
