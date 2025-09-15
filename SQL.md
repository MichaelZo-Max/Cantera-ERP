---

## **Contrato de Datos: Backend (SQL Server) ↔ Frontend (Versión Final)**

### **La Regla de Oro**

- **VISTAS (`RIP.VW_...`) son para LEER 👓:** Se usan para buscar y obtener datos maestros (clientes, productos). Son de **solo lectura (`SELECT`)**.
- **TABLAS (`RIP.APP_...`) son para TRABAJAR ✍️:** Se usan para crear, modificar y gestionar los registros del nuevo flujo (pedidos, despachos, etc.). Soportan operaciones de escritura (`INSERT`, `UPDATE`).

---

### **1. Vistas (Solo Lectura)**

#### **`RIP.VW_APP_CLIENTES`**

- **Propósito:** Para buscar y obtener la información de los clientes existentes en el sistema principal.
- **Columnas:** `id`, `name`, `rfc`, `address`, `phone`, `email`, `is_active`.
- **Ejemplo de Uso:**
  - **Buscar un cliente por name:**
    ```sql
    SELECT id, name, rfc FROM RIP.VW_APP_CLIENTES WHERE name LIKE '%[texto_busqueda]%';
    ```

\<br\>

#### **`RIP.VW_APP_PRODUCTOS`**

- **Propósito:** Para buscar productos, obtener su precio oficial y entender su formato de venta.
- **Columnas:**
  - `id` (INT): Identificador único del producto.
  - `codigo` (NVARCHAR): Código o referencia del producto.
  - `name` (NVARCHAR): Nombre del producto.
  - `-- MODIFICADO: Nueva columna para la lógica de la UI.`
  - `sell_format` (NVARCHAR): Indica cómo se vende el producto ('GRANEL', 'PAQUETE', 'UNIDAD', 'SERVICIO').
  - `price_per_unit` (DECIMAL): **Precio de venta real** por unidad.
  - `unit` (NVARCHAR): Unidad de medida base (ej. 'm3', 'Ton', 'SACO').
  - `is_active` (BIT): `1` si está activo, `0` si no.
- **Ejemplo de Uso:**
  - **Listar todos los productos activos:**
    ```sql
    SELECT id, name, price_per_unit, unit, sell_format FROM RIP.VW_APP_PRODUCTOS WHERE is_active = 1;
    ```

---

### **2. Tablas (Lectura y Escritura)**

#### **`RIP.APP_USUARIOS`**, **`RIP.APP_CAMIONES`**, **`RIP.APP_CHOFERES`**, **`RIP.APP_DESTINOS`**

- _(Sin cambios en su estructura o propósito principal.)_

\<br\>

#### **`RIP.APP_PEDIDOS` (Encabezado)**

- **Propósito:** Almacena el "contrato" o la orden de venta completa con el cliente.
- **Columnas:**
  - `id` (autonumérico)
  - `order_number`
  - `customer_id`
  - `truck_id`
  - `destination_id`
  - `-- MODIFICADO: El campo status ahora tiene un flujo más detallado.`
  - `status` (NVARCHAR): 'AWAITING_PAYMENT', 'PAID', 'PARTIALLY_DISPATCHED', 'DISPATCHED_COMPLETE', 'CANCELLED'.
  - `notes`
  - `created_by`, etc.

\<br\>

#### **`RIP.APP_PEDIDOS_ITEMS` (Líneas)**

- **Propósito:** Almacena los productos específicos del "contrato" de venta.
- **Columnas:**
  - `id` (autonumérico)
  - `order_id` (vincula con `APP_PEDIDOS`)
  - `product_id`
  - `quantity` (DECIMAL)
  - `price_per_unit` (DECIMAL): El precio se "congela" aquí.
  - `-- MODIFICADO: Nueva columna para congelar la unidad de venta.`
  - `unit` (NVARCHAR): La unidad de medida se "congela" aquí (ej. 'm3', 'SACO').

\<br\>

#### **`RIP.APP_DESPACHOS`**

- **Propósito:** `-- MODIFICADO: Ahora registra un viaje o un evento de retiro físico individual.` Un pedido puede tener múltiples despachos.
- **Columnas:**
  - `id` (autonumérico)
  - `order_id` (vincula con el contrato de venta en `APP_PEDIDOS`)
  - `-- MODIFICADO: El detalle de la carga ahora está en APP_DESPACHOS_ITEMS.`
  - `loaded_quantity` (DECIMAL): Aún puede ser útil como un total de control del viaje.
  - `loaded_by`, `load_photo_url`, `exited_by`, `exit_photo_url`, `status`, etc.

\<br\>

#### **`RIP.APP_DESPACHOS_ITEMS`** `-- NUEVA TABLA`

- **Propósito:** Detalla qué productos y qué cantidad específica se cargó en un único viaje (despacho). Es el vínculo entre el despacho y los ítems del pedido.
- **Columnas:**
  - `id` (autonumérico)
  - `despacho_id` (vincula con `APP_DESPACHOS`)
  - `pedido_item_id` (vincula con la línea del pedido original `APP_PEDIDOS_ITEMS`)
  - `dispatched_quantity` (DECIMAL): Cantidad cargada en este viaje específico.

\<br\>

#### **`RIP.APP_GUIAS_DESPACHO`** `-- NUEVA TABLA`

- **Propósito:** Almacena la información del documento legal (Guía de Despacho) que se genera para cada viaje.
- **Columnas:**
  - `id` (autonumérico)
  - `despacho_id` (vincula con el viaje en `APP_DESPACHOS`)
  - `numero_guia` (NVARCHAR)
  - `fecha_emision` (DATETIME)
  - y otros campos requeridos por ley.

---

### **Flujo de Ejemplo: Venta con Entrega Parcial** `-- FLUJO COMPLETAMENTE MODIFICADO`

**Escenario:** Un cliente paga por 30 m³ de arena, que retirará en 3 viajes de 10 m³.

1.  **Cajero crea el Pedido (Contrato):**

    - Se crea un registro en `RIP.APP_PEDIDOS` con `status = 'PAID'`. Se obtiene el `order_id` (ej. 152).
    - Se crea un registro en `RIP.APP_PEDIDOS_ITEMS`:
      ```sql
      INSERT INTO RIP.APP_PEDIDOS_ITEMS (order_id, product_id, quantity, price_per_unit, unit)
      VALUES (152, 1001, 30.00, 26.50, 'm3');
      -- Se obtiene el pedido_item_id (ej. 450)
      ```

2.  **Llega un camión para el primer viaje:**

    - **Paso 2a: Operador de Patio crea el Despacho (el viaje).**
      ```sql
      INSERT INTO RIP.APP_DESPACHOS (order_id, loaded_by, status) VALUES (152, 2, 'LOADING');
      -- Se obtiene el despacho_id (ej. 801)
      ```
    - **Paso 2b: Operador de Patio registra la carga específica de este viaje.**
      ```sql
      INSERT INTO RIP.APP_DESPACHOS_ITEMS (despacho_id, pedido_item_id, dispatched_quantity)
      VALUES (801, 450, 10.00); -- Carga 10m³ del item #450 en el viaje #801
      ```
    - **Paso 2c: Se genera la Guía de Despacho para este viaje.**
      ```sql
      INSERT INTO RIP.APP_GUIAS_DESPACHO (despacho_id, numero_guia, ...) VALUES (801, 'GUIA-001234', ...);
      ```
    - **Paso 2d: El sistema actualiza el estado del pedido general.**
      ```sql
      UPDATE RIP.APP_PEDIDOS SET status = 'PARTIALLY_DISPATCHED' WHERE id = 152;
      ```

3.  **Siguientes Viajes:**

    - El proceso del paso 2 se repite para los viajes 2 y 3.
    - Después del último viaje, el estado del pedido general se actualiza a `DISPATCHED_COMPLETE`.

---

\-- =================================================================
\-- SCRIPT DE DESPLIEGUE A PRODUCCIÓN (Versión Final Completa)
\-- Propósito: Crea y ajusta el esquema, tablas y vistas para el aplicativo.
\-- =================================================================

\-- 1. CREACIÓN DEL ESQUEMA
IF NOT EXISTS (SELECT \* FROM sys.schemas WHERE name = 'RIP')
BEGIN
EXEC('CREATE SCHEMA RIP');
END
GO

\-- 2. CREACIÓN DE TABLAS
\-- Se crean las tablas en orden de dependencia.

\-- Tabla de Usuarios
IF OBJECT_ID('RIP.APP_USUARIOS', 'U') IS NULL
CREATE TABLE RIP.APP_USUARIOS (
id INT IDENTITY(1,1) PRIMARY KEY,
email NVARCHAR(255) NOT NULL UNIQUE,
name NVARCHAR(255) NOT NULL,
role NVARCHAR(50) NOT NULL CHECK (role IN ('CASHIER', 'YARD', 'SECURITY', 'ADMIN', 'REPORTS')),
password_hash NVARCHAR(255) NOT NULL,
is_active BIT NOT NULL DEFAULT 1,
created_at DATETIME NOT NULL DEFAULT GETDATE(),
updated_at DATETIME NOT NULL DEFAULT GETDATE(),
CODVENDEDOR INT NULL,
FOREIGN KEY (CODVENDEDOR) REFERENCES dbo.VENDEDORES(CODVENDEDOR)
);
GO

\-- Tabla de Choferes
IF OBJECT_ID('RIP.APP_CHOFERES', 'U') IS NULL
BEGIN
CREATE TABLE RIP.APP_CHOFERES (
id INT IDENTITY(1,1) PRIMARY KEY,
name NVARCHAR(255) NOT NULL,
docId NVARCHAR(50) NULL,
phone NVARCHAR(50) NULL,
is_active BIT NOT NULL DEFAULT 1,
created_at DATETIME NOT NULL DEFAULT GETDATE(),
updated_at DATETIME NOT NULL DEFAULT GETDATE()
);
END
GO

\-- Tabla de Camiones
IF OBJECT_ID('RIP.APP_CAMIONES', 'U') IS NULL
CREATE TABLE RIP.APP_CAMIONES (
id INT IDENTITY(1,1) PRIMARY KEY,
placa NVARCHAR(20) NOT NULL UNIQUE,
brand NVARCHAR(100),
model NVARCHAR(100),
capacity DECIMAL(18, 2) NOT NULL,
driver_name NVARCHAR(255), -- Obsoleto, usar driver_id
driver_phone NVARCHAR(50), -- Obsoleto
driver_id INT NULL,
is_active BIT NOT NULL DEFAULT 1,
created_at DATETIME NOT NULL DEFAULT GETDATE(),
updated_at DATETIME NOT NULL DEFAULT GETDATE(),
CONSTRAINT FK_APP_CAMIONES_CHOFERES FOREIGN KEY (driver_id) REFERENCES RIP.APP_CHOFERES(id)
);
GO

\-- Tabla de Destinos
IF OBJECT_ID('RIP.APP_DESTINOS', 'U') IS NULL
CREATE TABLE RIP.APP_DESTINOS (
id INT PRIMARY KEY IDENTITY(1,1),
customer_id INT NOT NULL,
name NVARCHAR(255) NOT NULL,
address NVARCHAR(MAX) NULL,
is_active BIT NOT NULL DEFAULT 1,
created_at DATETIME DEFAULT GETDATE(),
updated_at DATETIME DEFAULT GETDATE(),
CONSTRAINT FK_APP_DESTINOS_CLIENTES FOREIGN KEY (customer_id) REFERENCES dbo.CLIENTES(CODCLIENTE)
);
GO

\-- Tabla de Encabezados de Pedidos (Modificada)
IF OBJECT_ID('RIP.APP_PEDIDOS', 'U') IS NULL
CREATE TABLE RIP.APP_PEDIDOS (
id INT IDENTITY(1,1) PRIMARY KEY,
order_number AS 'ORD-' + RIGHT('00000000' + CAST(id AS VARCHAR(8)), 8) PERSISTED,
customer_id INT NOT NULL,
truck_id INT NOT NULL,
destination_id INT NULL,
status NVARCHAR(50) NOT NULL DEFAULT 'AWAITING_PAYMENT',
notes NVARCHAR(MAX),
created_by INT NOT NULL,
created_at DATETIME NOT NULL DEFAULT GETDATE(),
updated_at DATETIME NOT NULL DEFAULT GETDATE(),
FOREIGN KEY (customer_id) REFERENCES dbo.CLIENTES(CODCLIENTE),
FOREIGN KEY (truck_id) REFERENCES RIP.APP_CAMIONES(id),
FOREIGN KEY (created_by) REFERENCES RIP.APP_USUARIOS(id),
FOREIGN KEY (destination_id) REFERENCES RIP.APP_DESTINOS(id),
CONSTRAINT CK_APP_PEDIDOS_status CHECK (status IN ('AWAITING_PAYMENT', 'PAID', 'PARTIALLY_DISPATCHED', 'DISPATCHED_COMPLETE', 'CANCELLED'))
);
ELSE
BEGIN
\-- Lógica para modificar la tabla si ya existe (como se hizo en el script de corrección)
IF OBJECT_ID('CK_APP_PEDIDOS_status', 'C') IS NOT NULL ALTER TABLE RIP.APP_PEDIDOS DROP CONSTRAINT CK_APP_PEDIDOS_status;
ALTER TABLE RIP.APP_PEDIDOS ADD CONSTRAINT CK_APP_PEDIDOS_status CHECK (status IN ('AWAITING_PAYMENT', 'PAID', 'PARTIALLY_DISPATCHED', 'DISPATCHED_COMPLETE', 'CANCELLED'));
END
GO

\-- Tabla de Líneas/Items de Pedidos (Modificada)
IF OBJECT_ID('RIP.APP_PEDIDOS_ITEMS', 'U') IS NULL
CREATE TABLE RIP.APP_PEDIDOS_ITEMS (
id INT IDENTITY(1,1) PRIMARY KEY,
order_id INT NOT NULL,
product_id INT NOT NULL,
quantity DECIMAL(18, 2) NOT NULL,
price_per_unit DECIMAL(18, 2) NOT NULL,
unit NVARCHAR(50) NULL,
subtotal AS (quantity \* price_per_unit),
FOREIGN KEY (order_id) REFERENCES RIP.APP_PEDIDOS(id),
FOREIGN KEY (product_id) REFERENCES dbo.ARTICULOS(CODARTICULO)
);
ELSE
BEGIN
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'unit' AND Object_ID = Object_ID(N'RIP.APP_PEDIDOS_ITEMS'))
BEGIN
ALTER TABLE RIP.APP_PEDIDOS_ITEMS ADD unit NVARCHAR(50) NULL;
END
END
GO

\-- Tabla de Despachos
IF OBJECT_ID('RIP.APP_DESPACHOS', 'U') IS NULL
CREATE TABLE RIP.APP_DESPACHOS (
id INT IDENTITY(1,1) PRIMARY KEY,
order_id INT NOT NULL,
loaded_quantity DECIMAL(18, 2),
loaded_by INT,
loaded_at DATETIME,
load_photo_url NVARCHAR(MAX) NULL,
exited_by INT,
exited_at DATETIME,
exit_photo_url NVARCHAR(MAX) NULL,
notes NVARCHAR(MAX),
status NVARCHAR(50) NOT NULL DEFAULT 'PENDING',
created_at DATETIME NOT NULL DEFAULT GETDATE(),
updated_at DATETIME NOT NULL DEFAULT GETDATE(),
FOREIGN KEY (order_id) REFERENCES RIP.APP_PEDIDOS(id),
FOREIGN KEY (loaded_by) REFERENCES RIP.APP_USUARIOS(id),
FOREIGN KEY (exited_by) REFERENCES RIP.APP_USUARIOS(id)
);
GO

\-- Tabla de Detalle de Despachos (Nueva)
IF OBJECT_ID('RIP.APP_DESPACHOS_ITEMS', 'U') IS NULL
CREATE TABLE RIP.APP_DESPACHOS_ITEMS (
id INT IDENTITY(1,1) PRIMARY KEY,
despacho_id INT NOT NULL,
pedido_item_id INT NOT NULL,
dispatched_quantity DECIMAL(18, 2) NOT NULL,
FOREIGN KEY (despacho_id) REFERENCES RIP.APP_DESPACHOS(id),
FOREIGN KEY (pedido_item_id) REFERENCES RIP.APP_PEDIDOS_ITEMS(id)
);
GO

\-- Tabla de Guías de Despacho (Nueva)
IF OBJECT_ID('RIP.APP_GUIAS_DESPACHO', 'U') IS NULL
CREATE TABLE RIP.APP_GUIAS_DESPACHO (
id INT IDENTITY(1,1) PRIMARY KEY,
despacho_id INT NOT NULL UNIQUE,
numero_guia NVARCHAR(100) NOT NULL,
fecha_emision DATETIME NOT NULL DEFAULT GETDATE(),
datos_transportista NVARCHAR(MAX),
origen NVARCHAR(255),
destino NVARCHAR(255),
document_url NVARCHAR(MAX),
created_by INT NOT NULL,
created_at DATETIME NOT NULL DEFAULT GETDATE(),
FOREIGN KEY (despacho_id) REFERENCES RIP.APP_DESPACHOS(id),
FOREIGN KEY (created_by) REFERENCES RIP.APP_USUARIOS(id)
);
GO

\-- 3. CREACIÓN DE VISTAS
\-- Vista de Clientes
CREATE OR ALTER VIEW RIP.VW_APP_CLIENTES AS
SELECT
CODCLIENTE AS id, NOMBRECLIENTE AS name, NIF20 AS rfc,
DIRECCION1 AS address, TELEFONO1 AS phone, E_MAIL AS email,
CASE WHEN DESCATALOGADO = 'F' THEN 1 ELSE 0 END AS is_active
FROM
dbo.CLIENTES;
GO

\-- Vista de Productos (Modificada)
CREATE OR ALTER VIEW RIP.VW_APP_PRODUCTOS AS
WITH ULTIMOS_PRECIOS AS (
SELECT
L.CODARTICULO, L.PRECIO,
ROW_NUMBER() OVER(PARTITION BY L.CODARTICULO ORDER BY C.FECHA DESC, C.NUMALBARAN DESC) AS RN
FROM dbo.ALBVENTALIN L
INNER JOIN dbo.ALBVENTACAB C ON L.NUMSERIE = C.NUMSERIE AND L.NUMALBARAN = C.NUMALBARAN AND L.N = C.N
WHERE L.PRECIO \> 0
)
SELECT
A.CODARTICULO AS id,
A.REFPROVEEDOR AS codigo,
A.DESCRIPCION AS name,
CASE
WHEN A.UNIDADMEDIDA IN ('m3', 'Ton', 'kg') THEN 'GRANEL'
WHEN A.UNIDADMEDIDA IN ('SACO', 'BOLSA', 'CUÑETE') THEN 'PAQUETE'
WHEN A.FAMILIA LIKE '%SERVICIO%' THEN 'SERVICIO'
ELSE 'UNIDAD'
END AS sell_format,
ISNULL(P.PRECIO, 0.00) AS price_per_unit,
A.UNIDADMEDIDA AS unit,
CASE WHEN A.DESCATALOGADO = 'F' THEN 1 ELSE 0 END AS is_active
FROM dbo.ARTICULOS A
LEFT JOIN ULTIMOS_PRECIOS P ON A.CODARTICULO = P.CODARTICULO AND P.RN = 1;
GO

PRINT '¡Despliegue completado\! El esquema, las tablas y las vistas han sido creados/actualizados.';
-- =================================================================
-- SCRIPT CORREGIDO para eliminar la columna truck_id de APP_PEDIDOS
-- =================================================================

-- Paso 1: Eliminar la clave foránea (CONSTRAINT) usando el nombre del error.
ALTER TABLE RIP.APP_PEDIDOS
DROP CONSTRAINT FK__APP_PEDID__truck__13739E55;
GO

-- Paso 2: Ahora que la columna está libre de dependencias, la eliminamos.
ALTER TABLE RIP.APP_PEDIDOS
DROP COLUMN truck_id;
GO

PRINT '¡Éxito! La clave foránea y la columna truck_id han sido eliminadas correctamente de RIP.APP_PEDIDOS.';
-- =================================================================
-- SCRIPT DE CORRECCIÓN FINAL Y ESTANDARIZACIÓN A INGLÉS
-- Propósito: Renombrar la columna de nombre del chofer a 'name'
-- y asegurar que la vista de despachos la use correctamente.
-- =================================================================

-- LOTE 1: ESTANDARIZAR LA COLUMNA DE NOMBRE A 'name'
-- =================================================================
-- Se renombra la columna 'nombre' a 'name' en la tabla de choferes
-- solo si la columna 'nombre' existe.
IF EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'nombre' AND Object_ID = Object_ID(N'RIP.APP_CHOFERES'))
BEGIN
    EXEC sp_rename 'RIP.APP_CHOFERES.nombre', 'name', 'COLUMN';
    PRINT 'Éxito: La columna ''nombre'' ha sido renombrada a ''name'' en la tabla RIP.APP_CHOFERES.';
END
GO -- Fin del lote

-- LOTE 2: RECREAR LA VISTA DE DESPACHOS CON EL NOMBRE CORRECTO
-- =================================================================
-- Esta es la versión final que usa 'name' de la tabla de choferes.
CREATE OR ALTER VIEW RIP.VW_APP_DESPACHOS
AS
SELECT
    d.id,
    d.order_id,
    d.camion_id,
    d.conductor_id,
    d.status AS estado,
    d.created_at,
    d.updated_at,
    d.notes,
    d.loaded_at AS loadedAt,
    d.load_photo_url AS loadPhoto,
    d.exited_at AS exitedAt,
    d.exit_photo_url AS exitPhoto,
    -- JSON para el pedido (order)
    (SELECT * FROM RIP.VW_APP_PEDIDOS p WHERE p.id = d.order_id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) AS [order],
    -- JSON para el camión (truck)
    (SELECT t.id, t.placa, t.brand, t.model, t.capacity FROM RIP.APP_CAMIONES t WHERE t.id = d.camion_id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) AS truck,
    -- JSON para el conductor (driver) - CORREGIDO
    (SELECT dr.id, dr.name, dr.docId FROM RIP.APP_CHOFERES dr WHERE dr.id = d.conductor_id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) AS driver
FROM
    RIP.APP_DESPACHOS d;
GO -- Fin del lote

PRINT 'Vista RIP.VW_APP_DESPACHOS creada/actualizada con el nombre de columna estandarizado.';
PRINT '¡Listo! La base de datos está ahora completamente alineada y estandarizada.';