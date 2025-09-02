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

1. Buscar producto en ProductPicker
2. Seleccionar formato (m³, ton, bolsa, etc.)
3. Ingresar cantidad con QuantityInput
4. Agregar a la tabla (se calcula precio automáticamente)



3. **Revisar totales** (subtotal + impuestos)
4. **Procesar pago**:

1. Seleccionar método (Efectivo/Tarjeta/Transferencia)
2. Ingresar referencia si aplica



5. **Asociar camión**:

1. Ingresar placa con formato automático (AAA-123A)
2. Tomar foto opcional del camión



6. **Autorizar despacho** → Crea el primer viaje con estado PENDIENTE


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

1. Verificar datos del viaje (cliente, destino, material)
2. Ingresar **cantidad real cargada**
3. Sistema muestra tolerancia (±5%) y si está dentro del rango
4. **Tomar foto obligatoria** del camión cargado
5. Agregar observaciones si hay diferencias



4. **Confirmar carga** → Cambia estado a CARGADO


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
2. Por ID de viaje
3. Por nombre del cliente



2. **Verificar información**:

1. Ver foto tomada en el patio
2. Confirmar datos: material, cantidad, cliente, destino
3. Verificar que el viaje esté CARGADO



3. **Autorizar salida**:

1. **Tomar foto obligatoria** de salida (placa visible)
2. Sistema genera automáticamente la Guía de Despacho
3. Cambia estado a COMPLETADO





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
2. Destino "Obra Residencial Norte"
3. Agrega: Arena fina, 10m³, $500/m³
4. Total: $5,000 + impuestos
5. Pago: Transferencia #TXN123456
6. Camión: Placa ABC-123A + foto
7. **Autoriza despacho** → Viaje #001 PENDIENTE



2. **PATIO** (10:30 AM):

1. Ve viaje #001 en lista pendiente
2. Confirma carga: 9.8m³ (dentro de tolerancia ±5%)
3. Toma foto del camión cargado
4. **Confirma carga** → Viaje #001 CARGADO



3. **VIGILANCIA** (11:15 AM):

1. Busca por placa "ABC-123A"
2. Ve foto del patio y datos del viaje
3. Toma foto de salida con placa visible
4. **Autoriza salida** → Viaje #001 COMPLETADO
5. Sistema genera Guía de Despacho automáticamente



4. **REPORTES** (Fin del día):

1. Filtra por fecha de hoy
2. Ve: 1 viaje completado, $5,000 vendidos, 9.8m³ despachados
3. Exporta reporte diario en PDF





El sistema garantiza trazabilidad completa con fotos en cada etapa y documentación automática, eliminando errores manuales y proporcionando control total del proceso de despacho.