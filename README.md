# Costeo de Recetas — App para restaurantes

App móvil (Expo / React Native) para calcular el costo real de una receta a
partir de sus ingredientes, y sugerir un precio de venta según el % de food
cost objetivo. Pensada como punto de partida para convertirla en un producto
SaaS que se vende a otros restaurantes.

## 1. Cómo correrla en tu celular (modo local, sin backend)

Requisitos: tener Node.js instalado en tu computadora, y la app **Expo Go**
instalada en tu celular (disponible en App Store / Google Play).

```bash
# 1. Entra a la carpeta del proyecto
cd costeo-recetas

# 2. Instala las dependencias normales
npm install

# 3. Instala las dependencias nativas con expo install (no con npm install),
#    para que Expo elija las versiones compatibles con tu versión de SDK
npx expo install @react-native-async-storage/async-storage @react-native-picker/picker react-native-screens react-native-safe-area-context

# 4. Arranca el proyecto
npx expo start
```

Esto te muestra un código QR en la terminal. Escanéalo con la app Expo Go y
la aplicación carga directo en tu teléfono (Android o iOS), sin necesidad de
Xcode ni Android Studio para esta fase de pruebas.

En este modo, los datos (ingredientes y recetas) se guardan localmente en el
teléfono con `AsyncStorage`. Es perfecto para probar la lógica de costeo,
pero **no** sincroniza entre dispositivos ni separa datos por restaurante —
para eso pasamos a la sección 3.

## 2. Cómo funciona el costeo (la lógica está en `src/utils/costing.js`)

1. Cada ingrediente se registra con cómo se compra: precio, cantidad y
   unidad (ej. "S/ 18 por 1 kg de queso").
2. Cada receta define cuánto se usa de cada ingrediente, en cualquier unidad
   compatible (ej. usar 150 g aunque el queso se compre por kg).
3. Se suma el costo de todos los insumos usados.
4. Se agregan mano de obra y gastos generales como % sobre el costo de
   insumos (tú decides esos porcentajes según tu negocio).
5. Se divide entre el número de porciones que rinde la receta → costo por
   porción.
6. Con el % de food cost objetivo (típicamente 25%–35% en restaurantes), se
   calcula el precio de venta sugerido: `costo por porción / (% objetivo / 100)`.

Si ya tienes un precio de venta en carta, la app también te dice cuál es tu
food cost real con ese precio, para que veas si estás perdiendo margen.

## 3. De app local a SaaS multi-restaurante

Para vender esto como suscripción a varios restaurantes necesitas que cada
restaurante tenga sus propios datos, separados, con login. La ruta más
simple para alguien con tu nivel (JS básico) es **Supabase**: te da base de
datos Postgres, autenticación y reglas de seguridad por fila, sin tener que
programar un backend desde cero.

Pasos:

1. Crea un proyecto gratis en supabase.com.
2. Crea estas tablas (puedes hacerlo desde el editor SQL de Supabase):
   - `organizations` (id, name, owner_id)
   - `profiles` (id = auth.users.id, organization_id, role)
   - `ingredients` (id, organization_id, name, purchase_price, purchase_quantity, purchase_unit)
   - `recipes` (id, organization_id, name, portions, labor_cost_percent, overhead_cost_percent, target_food_cost_percent, selling_price)
   - `recipe_ingredients` (id, recipe_id, ingredient_id, quantity, unit)
3. Activa Row Level Security (RLS) en cada tabla y crea una política tipo:
   `organization_id = (select organization_id from profiles where id = auth.uid())`
   Esto garantiza que un restaurante nunca vea los datos de otro, automáticamente.
4. Agrega login con `supabase.auth.signInWithPassword` / `signUp` (Supabase
   ya trae esto incluido).
5. Reemplaza las funciones de `src/context/DataContext.js` (las que hoy usan
   `AsyncStorage`) para que en su lugar llamen a `supabase.from(...)`. El
   resto de la app (las pantallas) no cambia, porque ya está escrita contra
   esa interfaz (`addIngredient`, `saveRecipe`, etc.).

Ya tienes el archivo `src/services/supabase.js` con el cliente listo para
conectar cuando llegues a este paso.

## 4. Cómo monetizar y "facturar" a los restaurantes

Aquí hay dos caminos distintos, y la diferencia de costo es grande:

**Camino A — Suscripción dentro de la app (in-app purchase).**
Usas un servicio como RevenueCat para manejar suscripciones a través de
Apple/Google. Es la integración más simple de programar, pero Apple y
Google se quedan con una comisión sobre cada cobro: la comisión estándar de ambas tiendas es 30%, reducida a 15% para desarrolladores que facturan menos de 1 millón de dólares al año por compras dentro de la app. Para Perú específicamente, esta sigue siendo la única opción permitida dentro de la app, ya que los enlaces de compra externos sin comisión solo están habilitados en Estados Unidos (pendiente de revisión por la Corte Suprema) y en la Unión Europea bajo otras condiciones; el resto del mundo, Perú incluido, sigue bajo las reglas estándar de compra dentro de la app.

**Camino B — Suscripción gestionada en tu propia web (recomendado para tu caso).**
La app se descarga gratis y simplemente verifica si la organización tiene
una suscripción activa (un campo en tu base de datos). El cobro en sí pasa
fuera de la app, en una página web tuya con Stripe, sin que la app mencione
ni enlace ese pago. Esto es exactamente lo que hacen herramientas B2B como
Slack, Notion o Figma en iOS y Android: la app es gratuita; el plan de pago se compra vía web, y Apple lo permite explícitamente mientras la app tenga funcionalidad gratuita real y no se dirija a los usuarios hacia la web desde dentro de la app. Con este esquema no pagas comisión a Apple ni a Google, y el flujo es: el dueño del restaurante entra a tu sitio web, paga con Stripe, tú activas su cuenta en Supabase, y desde ese momento puede iniciar sesión en la app móvil.

Para tu caso (vender a restaurantes, volumen probablemente bajo al inicio,
tú con experiencia básica en JS), el Camino B es más simple de construir
(no necesitas integrar StoreKit ni Play Billing) y te deja el 100% del
cobro. Lo más práctico: una landing page sencilla + Stripe Checkout +
webhook que actualiza `organizations.subscription_active = true` en
Supabase.

Una nota práctica para Perú: si facturas a otros negocios (B2B) y ellos
necesitan sustentar el gasto ante SUNAT, normalmente vas a necesitar emitir
factura electrónica (no boleta), lo cual implica tener RUC y un sistema de
facturación electrónica homologado (hay proveedores como Nubefact que se
integran fácilmente vía API con un sistema como Stripe + Supabase). No soy
contador ni abogado, así que para definir esto con exactitud conviene
confirmarlo con un contador antes de lanzar precios y empezar a cobrar.

## 5. Publicar en las tiendas

- **Google Play**: cuenta de desarrollador (pago único de 25 USD), generar
  un build con `eas build --platform android` (usando EAS Build de Expo),
  subir el `.aab` a Play Console, completar ficha de la tienda (capturas,
  descripción, política de privacidad) y enviar a revisión.
- **Apple App Store**: cuenta de Apple Developer Program (99 USD/año),
  generar build con `eas build --platform ios`, subirlo con
  `eas submit`, completar la ficha en App Store Connect y enviar a
  revisión. La revisión de Apple suele ser más estricta que la de Google;
  si tu app no vende nada dentro de ella (Camino B), no necesitas
  configurar nada de StoreKit.
- En ambos casos necesitarás una política de privacidad pública (puede ser
  una página web simple) porque la app maneja datos de costos del negocio.

## 6. Siguientes pasos sugeridos

1. Probar la app local con tus propias recetas reales para validar que la
   lógica de costeo refleja bien tu negocio (ajusta % de mano de obra y
   gastos generales a lo que realmente uses).
2. Migrar a Supabase y agregar login (sección 3).
3. Armar una landing page simple con planes y precios, y conectar Stripe
   (sección 4, Camino B).
4. Generar los builds con EAS y publicar primero en Google Play (proceso
   más rápido) mientras preparas la revisión de Apple.
