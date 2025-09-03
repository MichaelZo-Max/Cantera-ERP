Aquí tienes el contrato de datos final y actualizado, que incluye la gestión de destinos y los nuevos formatos de producto.

Este es el documento maestro y definitivo para el equipo de frontend.

-----

## **Contrato de Datos: Backend (SQL Server) ↔ Frontend (Versión Final y Completa)**

### **La Regla de Oro**

  * **VISTAS (`RIP.VW_...`) son para LEER 👓:** Se usan para buscar y obtener datos maestros (clientes, productos). Son de **solo lectura (`SELECT`)**.
  * **TABLAS (`RIP.APP_...`) son para TRABAJAR ✍️:** Se usan para crear, modificar y gestionar los registros del nuevo flujo (pedidos, despachos, etc.). Soportan operaciones de escritura (`INSERT`, `UPDATE`).

-----

### \#\# 1. Vistas (Solo Lectura)

#### **`RIP.VW_APP_CLIENTES`**

  * **Propósito:** Para buscar y obtener la información de los clientes existentes en el sistema principal.
  * **Columnas:**
      * `id` (INT): Identificador único del cliente.
      * `name` (NVARCHAR): Nombre o razón social del cliente.
      * `rfc` (NVARCHAR): Identificación fiscal.
      * `address` (NVARCHAR): Dirección principal.
      * `phone` (NVARCHAR): Teléfono de contacto.
      * `email` (NVARCHAR): Correo electrónico.
      * `is_active` (BIT): `1` si está activo, `0` si no.
  * **Ejemplo de Uso:**
      * **Buscar un cliente por nombre:**
        ```sql
        SELECT id, name, rfc FROM RIP.VW_APP_CLIENTES WHERE name LIKE '%[texto_busqueda]%';
        ```

\<br\>

#### **`RIP.VW_APP_PRODUCTOS`**

  * **Propósito:** Para buscar productos y obtener su información básica. **Importante:** El precio en esta vista es solo una referencia (el último precio de venta); el precio final se definirá por el formato seleccionado.
  * **Columnas:**
      * `id` (INT): Identificador único del producto.
      * `codigo` (NVARCHAR): Código o referencia del producto.
      * `name` (NVARCHAR): Nombre del producto.
      * `price_per_unit` (DECIMAL): **Precio de referencia**.
      * `unit` (NVARCHAR): Unidad de medida base (ej. 'm3', 'Ton').
      * `is_active` (BIT): `1` si está activo, `0` si no.
  * **Ejemplo de Uso:**
      * **Listar todos los productos activos:**
        ```sql
        SELECT id, name, unit FROM RIP.VW_APP_PRODUCTOS WHERE is_active = 1;
        ```

-----

### \#\# 2. Tablas (Lectura y Escritura)

#### **`RIP.APP_USUARIOS`**

  * **Propósito:** Gestiona los usuarios que acceden al aplicativo.
  * **Columnas:** `id` (autonumérico), `email`, `name`, `role`, `password_hash`, `is_active`, etc.

\<br\>

#### **`RIP.APP_CAMIONES`**

  * **Propósito:** Maestro de camiones disponibles.
  * **Columnas:** `id` (autonumérico), `placa`, `brand`, `model`, `capacity`, `driver_name`, `is_active`, etc.

\<br\>

#### **`RIP.APP_DESTINOS`**

  * **Propósito:** Gestiona las múltiples direcciones o lugares de entrega (destinos) para cada cliente.
  * **Columnas:** `id` (INT), `customer_id` (INT), `name` (NVARCHAR), `address` (NVARCHAR), `is_active` (BIT).
  * **Ejemplo de Uso:**
      * **Listar destinos de un cliente:**
        ```sql
        SELECT id, name, address FROM RIP.APP_DESTINOS WHERE customer_id = [id_cliente] AND is_active = 1;
        ```

\<br\>

#### **`RIP.APP_PRODUCTOS_FORMATOS` (Nuevo)**

  * **Propósito:** Gestiona las diferentes unidades de venta y precios para cada producto. Esta es la fuente principal para los precios.
  * **Columnas:**
      * `id` (INT): ID único del formato.
      * `product_id` (INT): ID del producto al que pertenece (FK a `dbo.ARTICULOS`).
      * `unit_base` (NVARCHAR): Unidad (M3, TON, SACO).
      * `base_unit_factor` (DECIMAL): Factor de conversión respecto a la unidad base del producto.
      * `sku` (NVARCHAR): Nombre descriptivo del formato (ej. "Arena a granel (m³)").
      * `price_per_unit` (DECIMAL): **Precio de venta real** para este formato.
      * `is_active` (BIT): `1` si el formato está activo.
  * **Ejemplo de Uso:**
      * **Obtener los formatos de un producto seleccionado:**
        ```sql
        SELECT id, sku, price_per_unit, unit_base FROM RIP.APP_PRODUCTOS_FORMATOS WHERE product_id = [id_producto] AND is_active = 1;
        ```

\<br\>

#### **`RIP.APP_PEDIDOS` (Encabezado - Actualizado)**

  * **Propósito:** Almacena la información general de cada orden.
  * **Columnas:** `id` (autonumérico), `order_number`, `customer_id`, `truck_id`, `destination_id`, `status`, `notes`, `created_by`, etc.

\<br\>

#### **`RIP.APP_PEDIDOS_ITEMS` (Líneas - Actualizado)**

  * **Propósito:** Almacena los productos y formatos específicos de un pedido.
  * **Columnas:**
      * `id` (autonumérico)
      * `order_id` (vincula con `APP_PEDIDOS`)
      * `product_id`
      * `format_id` (INT, NULL, FK a `APP_PRODUCTOS_FORMATOS`): **Importante**, para saber qué formato se vendió.
      * `quantity` (DECIMAL)
      * `price_per_unit` (DECIMAL): **El precio se "congela" aquí**, tomado del formato al momento de la venta.
  * **Ejemplo de Uso:**
      * **Añadir un producto a un pedido:**
        ```sql
        INSERT INTO RIP.APP_PEDIDOS_ITEMS (order_id, product_id, format_id, quantity, price_per_unit) VALUES (...);
        ```

\<br\>

#### **`RIP.APP_DESPACHOS`**

  * **Propósito:** Registra los eventos físicos: carga en patio y salida por vigilancia.
  * **Columnas:** `id` (autonumérico), `order_id`, `loaded_quantity`, `loaded_by`, `load_photo_url`, `exited_by`, `exit_photo_url`, `status`.

-----

### \#\# Flujo de Ejemplo: Crear un Pedido Completo

1.  **Cajero selecciona Cliente, Camión y Destino.**
2.  **Cajero crea el Encabezado del Pedido:** El aplicativo ejecuta un `INSERT` en `RIP.APP_PEDIDOS` y obtiene el nuevo `order_id`.
3.  **Cajero selecciona un Producto:** El aplicativo consulta `RIP.VW_APP_PRODUCTOS` para buscarlo.
4.  **Cajero selecciona un Formato:**
      * El aplicativo toma el `product_id` y consulta los formatos disponibles.
        ```sql
        SELECT id, sku, price_per_unit FROM RIP.APP_PRODUCTOS_FORMATOS WHERE product_id = 1001 AND is_active = 1;
        ```
5.  **Cajero añade el item al pedido:**
      * El aplicativo toma el `order_id`, `product_id`, el `format_id` seleccionado y el `price_per_unit` de ese formato.
        ```sql
        INSERT INTO RIP.APP_PEDIDOS_ITEMS (order_id, product_id, format_id, quantity, price_per_unit)
        VALUES (152, 1001, 1, 10, 26.50); -- Vende 10 unidades del formato #1 (Arena a granel) a 26.50
        ```


-- =================================================================
-- SCRIPT DE DESPLIEGUE A PRODUCCIÓN (Versión Final y Completa)
-- Propósito: Crea el esquema, tablas y vistas para el nuevo aplicativo.
-- =================================================================

-- 1. CREACIÓN DEL ESQUEMA
-- Crea el esquema 'RIP' si no existe para encapsular todos los nuevos objetos.
-- -----------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'RIP')
BEGIN
    EXEC('CREATE SCHEMA RIP');
END
GO


-- 2. CREACIÓN DE TABLAS
-- Se crean las tablas en orden de dependencia.
-- -----------------------------------------------------------------

-- Tabla de Usuarios
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

-- Tabla de Camiones
IF OBJECT_ID('RIP.APP_CAMIONES', 'U') IS NULL
CREATE TABLE RIP.APP_CAMIONES (
    id INT IDENTITY(1,1) PRIMARY KEY,
    placa NVARCHAR(20) NOT NULL UNIQUE,
    brand NVARCHAR(100),
    model NVARCHAR(100),
    capacity DECIMAL(18, 2) NOT NULL,
    driver_name NVARCHAR(255),
    driver_phone NVARCHAR(50),
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- Tabla de Destinos
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

-- Tabla de Formatos de Productos
IF OBJECT_ID('RIP.APP_PRODUCTOS_FORMATOS', 'U') IS NULL
CREATE TABLE RIP.APP_PRODUCTOS_FORMATOS (
    id INT PRIMARY KEY IDENTITY(1,1),
    product_id INT NOT NULL,
    unit_base NVARCHAR(50) NOT NULL, -- M3, TON, BOLSA, UNIDAD
    base_unit_factor DECIMAL(18, 4) NOT NULL DEFAULT 1,
    sku NVARCHAR(255) NULL, -- Ej: "Arena a granel (m³)"
    price_per_unit DECIMAL(18, 2) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_APP_PRODUCTOS_FORMATOS_ARTICULOS FOREIGN KEY (product_id) REFERENCES dbo.ARTICULOS(CODARTICULO)
);
GO

-- Tabla de Encabezados de Pedidos
IF OBJECT_ID('RIP.APP_PEDIDOS', 'U') IS NULL
CREATE TABLE RIP.APP_PEDIDOS (
    id INT IDENTITY(1,1) PRIMARY KEY,
    order_number AS 'ORD-' + RIGHT('00000000' + CAST(id AS VARCHAR(8)), 8) PERSISTED,
    customer_id INT NOT NULL,
    truck_id INT NOT NULL,
    destination_id INT NULL,
    status NVARCHAR(50) NOT NULL DEFAULT 'PENDING',
    notes NVARCHAR(MAX),
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (customer_id) REFERENCES dbo.CLIENTES(CODCLIENTE),
    FOREIGN KEY (truck_id) REFERENCES RIP.APP_CAMIONES(id),
    FOREIGN KEY (created_by) REFERENCES RIP.APP_USUARIOS(id),
    FOREIGN KEY (destination_id) REFERENCES RIP.APP_DESTINOS(id)
);
GO

-- Tabla de Líneas/Items de Pedidos
IF OBJECT_ID('RIP.APP_PEDIDOS_ITEMS', 'U') IS NULL
CREATE TABLE RIP.APP_PEDIDOS_ITEMS (
    id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    format_id INT NOT NULL,
    quantity DECIMAL(18, 2) NOT NULL,
    price_per_unit DECIMAL(18, 2) NOT NULL,
    subtotal AS (quantity * price_per_unit),
    FOREIGN KEY (order_id) REFERENCES RIP.APP_PEDIDOS(id),
    FOREIGN KEY (product_id) REFERENCES dbo.ARTICULOS(CODARTICULO),
    FOREIGN KEY (format_id) REFERENCES RIP.APP_PRODUCTOS_FORMATOS(id)
);
GO

-- Tabla de Despachos
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


-- 3. CREACIÓN DE VISTAS
-- Se crean las vistas que sirven de 'puente' al sistema principal.
-- -----------------------------------------------------------------

-- Vista de Clientes
CREATE OR ALTER VIEW RIP.VW_APP_CLIENTES AS
SELECT
    CODCLIENTE AS id,
    NOMBRECLIENTE AS name,
    NIF20 AS rfc,
    DIRECCION1 AS address,
    TELEFONO1 AS phone,
    E_MAIL AS email,
    CASE WHEN DESCATALOGADO = 'F' THEN 1 ELSE 0 END AS is_active
FROM
    dbo.CLIENTES;
GO

-- Vista de Productos (con lógica de último precio como referencia)
CREATE OR ALTER VIEW RIP.VW_APP_PRODUCTOS AS
WITH ULTIMOS_PRECIOS AS (
    SELECT
        L.CODARTICULO,
        L.PRECIO,
        ROW_NUMBER() OVER(PARTITION BY L.CODARTICULO ORDER BY C.FECHA DESC, C.NUMALBARAN DESC) AS RN
    FROM
        dbo.ALBVENTALIN L
    INNER JOIN
        dbo.ALBVENTACAB C ON L.NUMSERIE = C.NUMSERIE AND L.NUMALBARAN = C.NUMALBARAN AND L.N = C.N
    WHERE
        L.PRECIO > 0
)
SELECT
    A.CODARTICULO AS id,
    A.REFPROVEEDOR AS codigo,
    A.DESCRIPCION AS name,
    NULL AS area,
    NULL AS description,
    ISNULL(P.PRECIO, 0.00) AS price_per_unit,
    A.UNIDADMEDIDA AS unit,
    CASE WHEN A.DESCATALOGADO = 'F' THEN 1 ELSE 0 END AS is_active
FROM
    dbo.ARTICULOS A
LEFT JOIN
    ULTIMOS_PRECIOS P ON A.CODARTICULO = P.CODARTICULO AND P.RN = 1;
GO

PRINT '¡Despliegue completado! El esquema, las tablas y las vistas han sido creados/actualizados.';