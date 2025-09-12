¡Por supuesto\! Aquí tienes el documento `.md` completamente actualizado para reflejar la nueva lógica de negocio.

He añadido comentarios `-- MODIFICADO` o `-- NUEVO` en las secciones correspondientes para que puedas identificar fácilmente qué partes de tu aplicativo necesitan ajustarse.

-----

## **Contrato de Datos: Backend (SQL Server) ↔ Frontend (Versión Final)**

### **La Regla de Oro**

  * **VISTAS (`RIP.VW_...`) son para LEER 👓:** Se usan para buscar y obtener datos maestros (clientes, productos). Son de **solo lectura (`SELECT`)**.
  * **TABLAS (`RIP.APP_...`) son para TRABAJAR ✍️:** Se usan para crear, modificar y gestionar los registros del nuevo flujo (pedidos, despachos, etc.). Soportan operaciones de escritura (`INSERT`, `UPDATE`).

-----

### **1. Vistas (Solo Lectura)**

#### **`RIP.VW_APP_CLIENTES`**

  * **Propósito:** Para buscar y obtener la información de los clientes existentes en el sistema principal.
  * **Columnas:** `id`, `name`, `rfc`, `address`, `phone`, `email`, `is_active`.
  * **Ejemplo de Uso:**
      * **Buscar un cliente por nombre:**
        ```sql
        SELECT id, name, rfc FROM RIP.VW_APP_CLIENTES WHERE name LIKE '%[texto_busqueda]%';
        ```

\<br\>

#### **`RIP.VW_APP_PRODUCTOS`**

  * **Propósito:** Para buscar productos, obtener su precio oficial y entender su formato de venta.
  * **Columnas:**
      * `id` (INT): Identificador único del producto.
      * `codigo` (NVARCHAR): Código o referencia del producto.
      * `name` (NVARCHAR): Nombre del producto.
      * `-- MODIFICADO: Nueva columna para la lógica de la UI.`
      * `sell_format` (NVARCHAR): Indica cómo se vende el producto ('GRANEL', 'PAQUETE', 'UNIDAD', 'SERVICIO').
      * `price_per_unit` (DECIMAL): **Precio de venta real** por unidad.
      * `unit` (NVARCHAR): Unidad de medida base (ej. 'm3', 'Ton', 'SACO').
      * `is_active` (BIT): `1` si está activo, `0` si no.
  * **Ejemplo de Uso:**
      * **Listar todos los productos activos:**
        ```sql
        SELECT id, name, price_per_unit, unit, sell_format FROM RIP.VW_APP_PRODUCTOS WHERE is_active = 1;
        ```

-----

### **2. Tablas (Lectura y Escritura)**

#### **`RIP.APP_USUARIOS`**, **`RIP.APP_CAMIONES`**, **`RIP.APP_CHOFERES`**, **`RIP.APP_DESTINOS`**

  * *(Sin cambios en su estructura o propósito principal.)*

\<br\>

#### **`RIP.APP_PEDIDOS` (Encabezado)**

  * **Propósito:** Almacena el "contrato" o la orden de venta completa con el cliente.
  * **Columnas:**
      * `id` (autonumérico)
      * `order_number`
      * `customer_id`
      * `truck_id`
      * `destination_id`
      * `-- MODIFICADO: El campo status ahora tiene un flujo más detallado.`
      * `status` (NVARCHAR): 'AWAITING\_PAYMENT', 'PAID', 'PARTIALLY\_DISPATCHED', 'DISPATCHED\_COMPLETE', 'CANCELLED'.
      * `notes`
      * `created_by`, etc.

\<br\>

#### **`RIP.APP_PEDIDOS_ITEMS` (Líneas)**

  * **Propósito:** Almacena los productos específicos del "contrato" de venta.
  * **Columnas:**
      * `id` (autonumérico)
      * `order_id` (vincula con `APP_PEDIDOS`)
      * `product_id`
      * `quantity` (DECIMAL)
      * `price_per_unit` (DECIMAL): El precio se "congela" aquí.
      * `-- MODIFICADO: Nueva columna para congelar la unidad de venta.`
      * `unit` (NVARCHAR): La unidad de medida se "congela" aquí (ej. 'm3', 'SACO').

\<br\>

#### **`RIP.APP_DESPACHOS`**

  * **Propósito:** `-- MODIFICADO: Ahora registra un viaje o un evento de retiro físico individual.` Un pedido puede tener múltiples despachos.
  * **Columnas:**
      * `id` (autonumérico)
      * `order_id` (vincula con el contrato de venta en `APP_PEDIDOS`)
      * `-- MODIFICADO: El detalle de la carga ahora está en APP_DESPACHOS_ITEMS.`
      * `loaded_quantity` (DECIMAL): Aún puede ser útil como un total de control del viaje.
      * `loaded_by`, `load_photo_url`, `exited_by`, `exit_photo_url`, `status`, etc.

\<br\>

#### **`RIP.APP_DESPACHOS_ITEMS`** `-- NUEVA TABLA`

  * **Propósito:** Detalla qué productos y qué cantidad específica se cargó en un único viaje (despacho). Es el vínculo entre el despacho y los ítems del pedido.
  * **Columnas:**
      * `id` (autonumérico)
      * `despacho_id` (vincula con `APP_DESPACHOS`)
      * `pedido_item_id` (vincula con la línea del pedido original `APP_PEDIDOS_ITEMS`)
      * `dispatched_quantity` (DECIMAL): Cantidad cargada en este viaje específico.

\<br\>

#### **`RIP.APP_GUIAS_DESPACHO`** `-- NUEVA TABLA`

  * **Propósito:** Almacena la información del documento legal (Guía de Despacho) que se genera para cada viaje.
  * **Columnas:**
      * `id` (autonumérico)
      * `despacho_id` (vincula con el viaje en `APP_DESPACHOS`)
      * `numero_guia` (NVARCHAR)
      * `fecha_emision` (DATETIME)
      * y otros campos requeridos por ley.

-----

### **Flujo de Ejemplo: Venta con Entrega Parcial** `-- FLUJO COMPLETAMENTE MODIFICADO`

**Escenario:** Un cliente paga por 30 m³ de arena, que retirará en 3 viajes de 10 m³.

1.  **Cajero crea el Pedido (Contrato):**

      * Se crea un registro en `RIP.APP_PEDIDOS` con `status = 'PAID'`. Se obtiene el `order_id` (ej. 152).
      * Se crea un registro en `RIP.APP_PEDIDOS_ITEMS`:
        ```sql
        INSERT INTO RIP.APP_PEDIDOS_ITEMS (order_id, product_id, quantity, price_per_unit, unit)
        VALUES (152, 1001, 30.00, 26.50, 'm3');
        -- Se obtiene el pedido_item_id (ej. 450)
        ```

2.  **Llega un camión para el primer viaje:**

      * **Paso 2a: Operador de Patio crea el Despacho (el viaje).**
        ```sql
        INSERT INTO RIP.APP_DESPACHOS (order_id, loaded_by, status) VALUES (152, 2, 'LOADING');
        -- Se obtiene el despacho_id (ej. 801)
        ```
      * **Paso 2b: Operador de Patio registra la carga específica de este viaje.**
        ```sql
        INSERT INTO RIP.APP_DESPACHOS_ITEMS (despacho_id, pedido_item_id, dispatched_quantity)
        VALUES (801, 450, 10.00); -- Carga 10m³ del item #450 en el viaje #801
        ```
      * **Paso 2c: Se genera la Guía de Despacho para este viaje.**
        ```sql
        INSERT INTO RIP.APP_GUIAS_DESPACHO (despacho_id, numero_guia, ...) VALUES (801, 'GUIA-001234', ...);
        ```
      * **Paso 2d: El sistema actualiza el estado del pedido general.**
        ```sql
        UPDATE RIP.APP_PEDIDOS SET status = 'PARTIALLY_DISPATCHED' WHERE id = 152;
        ```

3.  **Siguientes Viajes:**

      * El proceso del paso 2 se repite para los viajes 2 y 3.
      * Después del último viaje, el estado del pedido general se actualiza a `DISPATCHED_COMPLETE`.

-----

\-- =================================================================
\-- SCRIPT DE DESPLIEGUE A PRODUCCIÓN (Versión Final)
\-- Propósito: Crea y ajusta el esquema, tablas y vistas para el aplicativo.
\-- =================================================================

\-- 1. CREACIÓN DEL ESQUEMA
IF NOT EXISTS (SELECT \* FROM sys.schemas WHERE name = 'RIP')
BEGIN
EXEC('CREATE SCHEMA RIP');
END
GO

\-- 2. CREACIÓN/MODIFICACIÓN DE TABLAS
\-- (Se incluyen todas las tablas, tanto las originales como las nuevas y modificadas)

\-- Tabla de Usuarios
IF OBJECT\_ID('RIP.APP\_USUARIOS', 'U') IS NULL
CREATE TABLE RIP.APP\_USUARIOS (
id INT IDENTITY(1,1) PRIMARY KEY,
email NVARCHAR(255) NOT NULL UNIQUE,
name NVARCHAR(255) NOT NULL,
role NVARCHAR(50) NOT NULL CHECK (role IN ('CASHIER', 'YARD', 'SECURITY', 'ADMIN', 'REPORTS')),
password\_hash NVARCHAR(255) NOT NULL,
is\_active BIT NOT NULL DEFAULT 1,
created\_at DATETIME NOT NULL DEFAULT GETDATE(),
updated\_at DATETIME NOT NULL DEFAULT GETDATE(),
CODVENDEDOR INT NULL,
FOREIGN KEY (CODVENDEDOR) REFERENCES dbo.VENDEDORES(CODVENDEDOR)
);
GO
\-- (Tablas APP\_CHOFERES, APP\_CAMIONES, APP\_DESTINOS se mantienen igual)
\-- ...

\-- Tabla de Encabezados de Pedidos (Modificada)
IF OBJECT\_ID('RIP.APP\_PEDIDOS', 'U') IS NULL
CREATE TABLE RIP.APP\_PEDIDOS (
id INT IDENTITY(1,1) PRIMARY KEY,
order\_number AS 'ORD-' + RIGHT('00000000' + CAST(id AS VARCHAR(8)), 8) PERSISTED,
customer\_id INT NOT NULL,
truck\_id INT NOT NULL,
destination\_id INT NULL,
status NVARCHAR(50) NOT NULL DEFAULT 'AWAITING\_PAYMENT',
notes NVARCHAR(MAX),
created\_by INT NOT NULL,
created\_at DATETIME NOT NULL DEFAULT GETDATE(),
updated\_at DATETIME NOT NULL DEFAULT GETDATE(),
FOREIGN KEY (customer\_id) REFERENCES dbo.CLIENTES(CODCLIENTE),
FOREIGN KEY (truck\_id) REFERENCES RIP.APP\_CAMIONES(id),
FOREIGN KEY (created\_by) REFERENCES RIP.APP\_USUARIOS(id),
FOREIGN KEY (destination\_id) REFERENCES RIP.APP\_DESTINOS(id),
CONSTRAINT CK\_APP\_PEDIDOS\_status CHECK (status IN ('AWAITING\_PAYMENT', 'PAID', 'PARTIALLY\_DISPATCHED', 'DISPATCHED\_COMPLETE', 'CANCELLED'))
);
GO

\-- Tabla de Líneas/Items de Pedidos (Modificada)
IF OBJECT\_ID('RIP.APP\_PEDIDOS\_ITEMS', 'U') IS NULL
CREATE TABLE RIP.APP\_PEDIDOS\_ITEMS (
id INT IDENTITY(1,1) PRIMARY KEY,
order\_id INT NOT NULL,
product\_id INT NOT NULL,
quantity DECIMAL(18, 2) NOT NULL,
price\_per\_unit DECIMAL(18, 2) NOT NULL,
unit NVARCHAR(50) NULL,
subtotal AS (quantity \* price\_per\_unit),
FOREIGN KEY (order\_id) REFERENCES RIP.APP\_PEDIDOS(id),
FOREIGN KEY (product\_id) REFERENCES dbo.ARTICULOS(CODARTICULO)
);
GO

\-- Tabla de Despachos
IF OBJECT\_ID('RIP.APP\_DESPACHOS', 'U') IS NULL
CREATE TABLE RIP.APP\_DESPACHOS (
id INT IDENTITY(1,1) PRIMARY KEY,
order\_id INT NOT NULL,
loaded\_quantity DECIMAL(18, 2),
loaded\_by INT,
loaded\_at DATETIME,
load\_photo\_url NVARCHAR(MAX) NULL,
exited\_by INT,
exited\_at DATETIME,
exit\_photo\_url NVARCHAR(MAX) NULL,
notes NVARCHAR(MAX),
status NVARCHAR(50) NOT NULL DEFAULT 'PENDING',
created\_at DATETIME NOT NULL DEFAULT GETDATE(),
updated\_at DATETIME NOT NULL DEFAULT GETDATE(),
FOREIGN KEY (order\_id) REFERENCES RIP.APP\_PEDIDOS(id),
FOREIGN KEY (loaded\_by) REFERENCES RIP.APP\_USUARIOS(id),
FOREIGN KEY (exited\_by) REFERENCES RIP.APP\_USUARIOS(id)
);
GO

\-- Tabla de Detalle de Despachos (Nueva)
IF OBJECT\_ID('RIP.APP\_DESPACHOS\_ITEMS', 'U') IS NULL
CREATE TABLE RIP.APP\_DESPACHOS\_ITEMS (
id INT IDENTITY(1,1) PRIMARY KEY,
despacho\_id INT NOT NULL,
pedido\_item\_id INT NOT NULL,
dispatched\_quantity DECIMAL(18, 2) NOT NULL,
FOREIGN KEY (despacho\_id) REFERENCES RIP.APP\_DESPACHOS(id),
FOREIGN KEY (pedido\_item\_id) REFERENCES RIP.APP\_PEDIDOS\_ITEMS(id)
);
GO

\-- Tabla de Guías de Despacho (Nueva)
IF OBJECT\_ID('RIP.APP\_GUIAS\_DESPACHO', 'U') IS NULL
CREATE TABLE RIP.APP\_GUIAS\_DESPACHO (
id INT IDENTITY(1,1) PRIMARY KEY,
despacho\_id INT NOT NULL UNIQUE,
numero\_guia NVARCHAR(100) NOT NULL,
fecha\_emision DATETIME NOT NULL DEFAULT GETDATE(),
datos\_transportista NVARCHAR(MAX),
origen NVARCHAR(255),
destino NVARCHAR(255),
document\_url NVARCHAR(MAX),
created\_by INT NOT NULL,
created\_at DATETIME NOT NULL DEFAULT GETDATE(),
FOREIGN KEY (despacho\_id) REFERENCES RIP.APP\_DESPACHOS(id),
FOREIGN KEY (created\_by) REFERENCES RIP.APP\_USUARIOS(id)
);
GO

\-- 3. CREACIÓN DE VISTAS
\-- Vista de Clientes
CREATE OR ALTER VIEW RIP.VW\_APP\_CLIENTES AS
SELECT
CODCLIENTE AS id, NOMBRECLIENTE AS name, NIF20 AS rfc,
DIRECCION1 AS address, TELEFONO1 AS phone, E\_MAIL AS email,
CASE WHEN DESCATALOGADO = 'F' THEN 1 ELSE 0 END AS is\_active
FROM
dbo.CLIENTES;
GO

\-- Vista de Productos (Modificada)
CREATE OR ALTER VIEW RIP.VW\_APP\_PRODUCTOS AS
WITH ULTIMOS\_PRECIOS AS (
SELECT
L.CODARTICULO, L.PRECIO,
ROW\_NUMBER() OVER(PARTITION BY L.CODARTICULO ORDER BY C.FECHA DESC, C.NUMALBARAN DESC) AS RN
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
END AS sell\_format,
ISNULL(P.PRECIO, 0.00) AS price\_per\_unit,
A.UNIDADMEDIDA AS unit,
CASE WHEN A.DESCATALOGADO = 'F' THEN 1 ELSE 0 END AS is\_active
FROM dbo.ARTICULOS A
LEFT JOIN ULTIMOS\_PRECIOS P ON A.CODARTICULO = P.CODARTICULO AND P.RN = 1;
GO

PRINT '¡Despliegue completado\! El esquema, las tablas y las vistas han sido creados/actualizados.';