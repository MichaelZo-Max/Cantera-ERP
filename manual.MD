## **FLUJO GENERAL DEL PROCESO**

**1. CAJERO** → Crea el "contrato" de venta y autoriza el transporte (camiones y choferes).
**2. PATIO** → Selecciona un camión autorizado, crea el viaje, y confirma la carga real con foto.
**3. VIGILANCIA** → Autoriza la salida del viaje y genera la guía de despacho.
**4. ADMIN** → Mantiene los catálogos del sistema actualizados.
**5. REPORTES** → Analiza las operaciones y exporta datos clave.

---

## **MANUAL POR ROL**

### **🏪 CAJERO - Comanda y Pago**

**Objetivo**: Crear la orden de venta (el "contrato"), procesar el pago y autorizar qué vehículos y personal pueden realizar los despachos.

**Flujo diario**:

1.  **Seleccionar cliente y destino** desde los buscadores.
2.  **Construir la orden**:
    - Buscar y añadir productos con sus cantidades.
    - El sistema calcula los precios y subtotales automáticamente.
3.  **Autorizar Transporte**:
    - En la sección de "Autorización de Transporte", **seleccionar uno o más camiones** de la lista de vehículos disponibles.
    - **Seleccionar uno o más choferes** autorizados para realizar los retiros.
4.  **Revisar totales** y procesar el pago (Efectivo, Tarjeta, etc.).
5.  **Crear Pedido** → La orden queda registrada con status `PAID` y con una lista de transporte autorizado, lista para que el patio la procese.

**Casos especiales**:

- Órdenes que serán retiradas por varios camiones diferentes.
- Clientes que envían distintos choferes para una misma orden.

---

### **🚛 PATIO - Creación de Viaje y Carga**

**Objetivo**: Crear un viaje (despacho) para un camión autorizado y confirmar la cantidad real cargada.

**Flujo diario**:

1.  **Ver lista de órdenes pagadas** que esperan ser despachadas.
2.  **Seleccionar la orden** que el camión ha venido a retirar.
3.  **En modal de creación de viaje**:
    - Seleccionar la **placa del camión** que ha llegado (el sistema solo mostrará los autorizados por el cajero).
    - Seleccionar el **nombre del chofer** presente.
    - **Crear el Viaje** → Esto genera un nuevo despacho con status `LOADING`.
4.  **En modal de confirmación de carga**:
    - Ingresar la **cantidad real cargada**.
    - El sistema valida si la cantidad está dentro de la tolerancia permitida.
    - **Tomar foto obligatoria** del camión cargado.
    - Agregar observaciones si es necesario.
5.  **Confirmar Carga** → El status del viaje cambia a `CARGADO`.

**Alertas importantes**:

- ⚠️ Cantidad fuera de tolerancia (requiere justificación).
- ⚠️ Foto obligatoria (no se puede confirmar sin ella).
- ✅ Carga dentro de la tolerancia (proceso normal).

---

### **🛡️ VIGILANCIA - Control de Salida**

**Objetivo**: Autorizar salidas de viajes cargados y generar la documentación legal.

**Flujo diario**:

1.  **Búsqueda rápida** del viaje por placa, ID o cliente.
2.  **Verificar información**:
    - Revisar la foto de la carga tomada en el patio.
    - Confirmar que el status del viaje sea `CARGADO`.
3.  **Autorizar salida**:
    - **Tomar foto obligatoria** de la salida del camión.
    - El sistema genera automáticamente la **Guía de Despacho**.
    - El status del viaje cambia a `EXITED` (o `COMPLETADO`).
    - El status general de la orden se actualiza (`PARTIALLY_DISPATCHED` o `DISPATCHED_COMPLETE`).

**Validaciones de seguridad**:

- ❌ No permite la salida si el viaje no está `CARGADO`.
- ❌ Requiere foto de salida obligatoria.

---

### **⚙️ ADMIN - Gestión de Catálogos**

**(Sin cambios en este flujo)**

**Objetivo**: Mantener actualizados todos los catálogos del sistema (Productos, Clientes, Destinos, Camiones, Choferes, Usuarios).

---

### **📊 REPORTES - Análisis y Exportación**

**(Sin cambios en este flujo)**

**Objetivo**: Generar reportes personalizados y métricas de negocio con filtros por fecha, cliente, producto y status.

---

## **EJEMPLO DE CASO DE USO COMPLETO (ACTUALIZADO)**

### **Escenario**: "Constructora ABC" pide 30m³ de arena, que serán retirados por dos camiones distintos.

1.  **CAJERO** (9:00 AM):

    - Selecciona cliente "Constructora ABC" y destino "Obra Residencial Norte".
    - Agrega: Arena fina, 30m³.
    - Total: $15,000 + impuestos.
    - Pago: Transferencia #TXN123456.
    - **Autoriza Transporte**:
      - Camiones: `ABC-123A`, `XYZ-789B`.
      - Choferes: `Juan Pérez`, `Carlos Gómez`.
    - **Crea Pedido** → Orden #152 queda en status `PAID`.

2.  **PATIO** (10:30 AM):

    - Llega el camión `ABC-123A` con `Juan Pérez`.
    - El operador selecciona la Orden #152.
    - Selecciona el camión `ABC-123A` y al chofer `Juan Pérez` de la lista de autorizados.
    - **Crea el Viaje** → Se genera el Despacho #801.
    - Confirma la carga: 15.1m³ (dentro de tolerancia).
    - Toma la foto del camión cargado.
    - **Confirma Carga** → Viaje #801 queda `CARGADO`. La orden #152 pasa a `PARTIALLY_DISPATCHED`.

3.  **VIGILANCIA** (11:15 AM):
    - Busca por placa "ABC-123A".
    - Ve la foto del patio y los datos del viaje #801.
    - Toma la foto de salida.
    - **Autoriza Salida** → Viaje #801 queda `EXITED`. Se genera su Guía de Despacho.

_(El proceso se repetiría para el segundo camión `XYZ-789B` cuando llegue, creando un nuevo despacho asociado a la misma orden #152)_
