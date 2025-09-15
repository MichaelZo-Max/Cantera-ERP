## **FLUJO GENERAL DEL PROCESO**

**1. CAJERO** → Crea orden y autoriza despacho
**2. PATIO** → Confirma carga real con foto
**3. VIGILANCIA** → Autoriza salida y genera guía
**4. ADMIN** → Mantiene catálogos actualizados
**5. REPORTES** → Analiza operaciones y exporta datos

---

## **MANUAL POR ROL**

### **🏪 CAJERO - Comanda y Pago**

**Objetivo**: Crear órdenes pagadas y autorizar despachos

**Flujo diario**:

1. **Seleccionar cliente y destino** desde los dropdowns
2. **Construir orden**:

3. Buscar producto en ProductPicker
4. Seleccionar formato (m³, ton, bolsa, etc.)
5. Ingresar cantidad con QuantityInput
6. Agregar a la tabla (se calcula precio automáticamente)

7. **Revisar totales** (subtotal + impuestos)
8. **Procesar pago**:

9. Seleccionar método (Efectivo/Tarjeta/Transferencia)
10. Ingresar referencia si aplica

11. **Asociar camión**:

12. Ingresar placa con formato automático (AAA-123A)
13. Tomar foto opcional del camión

14. **Autorizar despacho** → Crea el primer viaje con estado PENDIENTE

**Casos especiales**:

- Órdenes con múltiples productos
- Descuentos o precios especiales
- Clientes nuevos (coordinar con Admin)

---

### **🚛 PATIO - Confirmación de Carga**

**Objetivo**: Confirmar cantidad real cargada y documentar con foto

**Flujo diario**:

1. **Ver lista de viajes pendientes** en tarjetas grandes
2. **Seleccionar viaje** tocando la tarjeta
3. **En modal de confirmación**:

4. Verificar datos del viaje (cliente, destino, material)
5. Ingresar **cantidad real cargada**
6. Sistema muestra tolerancia (±5%) y si está dentro del rango
7. **Tomar foto obligatoria** del camión cargado
8. Agregar observaciones si hay diferencias

9. **Confirmar carga** → Cambia estado a CARGADO

**Alertas importantes**:

- ⚠️ Cantidad fuera de tolerancia (requiere observaciones)
- ⚠️ Foto obligatoria (no puede confirmar sin ella)
- ✅ Carga dentro de tolerancia (proceso normal)

---

### **🛡️ VIGILANCIA - Control de Salida**

**Objetivo**: Autorizar salidas y generar documentación oficial

**Flujo diario**:

1. **Búsqueda rápida**:

1. Por placa del camión
1. Por ID de viaje
1. Por name del cliente

1. **Verificar información**:

1. Ver foto tomada en el patio
1. Confirmar datos: material, cantidad, cliente, destino
1. Verificar que el viaje esté CARGADO

1. **Autorizar salida**:

1. **Tomar foto obligatoria** de salida (placa visible)
1. Sistema genera automáticamente la Guía de Despacho
1. Cambia estado a COMPLETADO

**Validaciones de seguridad**:

- ❌ No permite salida si viaje no está CARGADO
- ❌ Alerta si orden no está PAGADA
- ❌ Requiere foto de salida obligatoria

---

### **⚙️ ADMIN - Gestión de Catálogos**

**Objetivo**: Mantener actualizados todos los catálogos del sistema

**Pestañas disponibles**:

1. **Productos**: Crear/editar materiales (arena, grava, etc.)
2. **Formatos**: Definir unidades y factores de conversión
3. **Clientes**: Gestionar base de clientes
4. **Destinos**: Mantener direcciones de entrega
5. **Camiones**: Registrar vehículos y placas
6. **Choferes**: Base de datos de conductores
7. **Usuarios**: Gestión de accesos por rol

**Funciones por pestaña**:

- **Buscar** en tiempo real
- **Crear nuevo** con formulario validado
- **Editar** registros existentes
- **Activar/Desactivar** sin eliminar datos

---

### **📊 REPORTES - Análisis y Exportación**

**Objetivo**: Generar reportes personalizados y métricas de negocio

**Filtros disponibles**:

- **Rango de fechas** (desde/hasta)
- **Cliente específico**
- **Producto/material**
- **Estado** (Pendiente, Cargado, Completado)

**Métricas automáticas**:

- 💰 Total vendido ($)
- 📦 Cantidad despachada (m³/ton)
- 🚛 Viajes completados

**Exportación**:

- **CSV**: Para análisis en Excel
- **PDF**: Para reportes oficiales con métricas

---

## **EJEMPLO DE CASO DE USO COMPLETO**

### **Escenario**: Cliente "Constructora ABC" pide 10m³ de arena

1. **CAJERO** (9:00 AM):

1. Selecciona cliente "Constructora ABC"
1. Destino "Obra Residencial Norte"
1. Agrega: Arena fina, 10m³, $500/m³
1. Total: $5,000 + impuestos
1. Pago: Transferencia #TXN123456
1. Camión: Placa ABC-123A + foto
1. **Autoriza despacho** → Viaje #001 PENDIENTE

1. **PATIO** (10:30 AM):

1. Ve viaje #001 en lista pendiente
1. Confirma carga: 9.8m³ (dentro de tolerancia ±5%)
1. Toma foto del camión cargado
1. **Confirma carga** → Viaje #001 CARGADO

1. **VIGILANCIA** (11:15 AM):

1. Busca por placa "ABC-123A"
1. Ve foto del patio y datos del viaje
1. Toma foto de salida con placa visible
1. **Autoriza salida** → Viaje #001 COMPLETADO
1. Sistema genera Guía de Despacho automáticamente

1. **REPORTES** (Fin del día):

1. Filtra por fecha de hoy
1. Ve: 1 viaje completado, $5,000 vendidos, 9.8m³ despachados
1. Exporta reporte diario en PDF

El sistema garantiza trazabilidad completa con fotos en cada etapa y documentación automática, eliminando errores manuales y proporcionando control total del proceso de despacho.
