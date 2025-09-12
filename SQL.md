Claro, aquí tienes el documento de contrato de datos y el script de despliegue actualizados para reflejar la eliminación de los "formatos de producto".

-----

## **Contrato de Datos: Backend (SQL Server) ↔ Frontend (Versión Actualizada)**

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

  * **Propósito:** Para buscar productos y obtener su **precio de venta oficial**. Esta vista es la fuente de verdad para el precio de cada artículo.
  * **Columnas:**
      * `id` (INT): Identificador único del producto.
      * `codigo` (NVARCHAR): Código o referencia del producto.
      * `name` (NVARCHAR): Nombre del producto.
      * `price_per_unit` (DECIMAL): **Precio de venta real** por unidad.
      * `unit` (NVARCHAR): Unidad de medida base (ej. 'm3', 'Ton').
      * `is_active` (BIT): `1` si está activo, `0` si no.
  * **Ejemplo de Uso:**
      * **Listar todos los productos activos:**
        ```sql
        SELECT id, name, price_per_unit, unit FROM RIP.VW_APP_PRODUCTOS WHERE is_active = 1;
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

#### **`RIP.APP_PEDIDOS` (Encabezado)**

  * **Propósito:** Almacena la información general de cada orden.
  * **Columnas:** `id` (autonumérico), `order_number`, `customer_id`, `truck_id`, `destination_id`, `status`, `notes`, `created_by`, etc.

\<br\>

#### **`RIP.APP_PEDIDOS_ITEMS` (Líneas - Actualizado)**

  * **Propósito:** Almacena los productos específicos de un pedido.
  * **Columnas:**
      * `id` (autonumérico)
      * `order_id` (vincula con `APP_PEDIDOS`)
      * `product_id`
      * `quantity` (DECIMAL)
      * `price_per_unit` (DECIMAL): **El precio se "congela" aquí**, tomado del producto al momento de la venta.
  * **Ejemplo de Uso:**
      * **Añadir un producto a un pedido:**
        ```sql
        INSERT INTO RIP.APP_PEDIDOS_ITEMS (order_id, product_id, quantity, price_per_unit) VALUES (...);
        ```

\<br\>

#### **`RIP.APP_DESPACHOS`**

  * **Propósito:** Registra los eventos físicos: carga en patio y salida por vigilancia.
  * **Columnas:** `id` (autonumérico), `order_id`, `loaded_quantity`, `loaded_by`, `load_photo_url`, `exited_by`, `exit_photo_url`, `status`.

-----

### \#\# Flujo de Ejemplo: Crear un Pedido Completo

1.  **Cajero selecciona Cliente, Camión y Destino.**
2.  **Cajero crea el Encabezado del Pedido:** El aplicativo ejecuta un `INSERT` en `RIP.APP_PEDIDOS` y obtiene el nuevo `order_id`.
3.  **Cajero busca y selecciona un Producto:**
      * El aplicativo consulta `RIP.VW_APP_PRODUCTOS` para buscarlo y obtener su `price_per_unit`.
        ```sql
        SELECT id, name, price_per_unit FROM RIP.VW_APP_PRODUCTOS WHERE name LIKE '%arena%';
        ```
4.  **Cajero añade el item al pedido:**
      * El aplicativo toma el `order_id`, `product_id`, la cantidad y el `price_per_unit` obtenido en el paso anterior.
        ```sql
        INSERT INTO RIP.APP_PEDIDOS_ITEMS (order_id, product_id, quantity, price_per_unit)
        VALUES (152, 1001, 10, 26.50); -- Vende 10 unidades del producto #1001 a 26.50
        ```

-----

\-- =================================================================
\-- SCRIPT DE DESPLIEGUE A PRODUCCIÓN (Versión Actualizada)
\-- Propósito: Crea el esquema, tablas y vistas para el aplicativo.
\-- =================================================================

\-- 1. CREACIÓN DEL ESQUEMA
\-- Crea el esquema 'RIP' si no existe para encapsular todos los nuevos objetos.

-----

IF NOT EXISTS (SELECT \* FROM sys.schemas WHERE name = 'RIP')
BEGIN
EXEC('CREATE SCHEMA RIP');
END
GO

\-- 2. CREACIÓN DE TABLAS
\-- Se crean las tablas en orden de dependencia.

-----

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

\-- Tabla de Choferes
IF OBJECT\_ID('RIP.APP\_CHOFERES', 'U') IS NULL
BEGIN
CREATE TABLE RIP.APP\_CHOFERES (
id INT IDENTITY(1,1) PRIMARY KEY,
nombre NVARCHAR(255) NOT NULL,
docId NVARCHAR(50) NULL,
phone NVARCHAR(50) NULL,
is\_active BIT NOT NULL DEFAULT 1,
created\_at DATETIME NOT NULL DEFAULT GETDATE(),
updated\_at DATETIME NOT NULL DEFAULT GETDATE()
);
END
GO

\-- Tabla de Camiones
IF OBJECT\_ID('RIP.APP\_CAMIONES', 'U') IS NULL
CREATE TABLE RIP.APP\_CAMIONES (
id INT IDENTITY(1,1) PRIMARY KEY,
placa NVARCHAR(20) NOT NULL UNIQUE,
brand NVARCHAR(100),
model NVARCHAR(100),
capacity DECIMAL(18, 2) NOT NULL,
driver\_name NVARCHAR(255), -- Obsoleto, usar driver\_id
driver\_phone NVARCHAR(50), -- Obsoleto
driver\_id INT NULL,
is\_active BIT NOT NULL DEFAULT 1,
created\_at DATETIME NOT NULL DEFAULT GETDATE(),
updated\_at DATETIME NOT NULL DEFAULT GETDATE(),
CONSTRAINT FK\_APP\_CAMIONES\_CHOFERES FOREIGN KEY (driver\_id) REFERENCES RIP.APP\_CHOFERES(id)
);
GO

\-- Tabla de Destinos
IF OBJECT\_ID('RIP.APP\_DESTINOS', 'U') IS NULL
CREATE TABLE RIP.APP\_DESTINOS (
id INT PRIMARY KEY IDENTITY(1,1),
customer\_id INT NOT NULL,
name NVARCHAR(255) NOT NULL,
address NVARCHAR(MAX) NULL,
is\_active BIT NOT NULL DEFAULT 1,
created\_at DATETIME DEFAULT GETDATE(),
updated\_at DATETIME DEFAULT GETDATE(),
CONSTRAINT FK\_APP\_DESTINOS\_CLIENTES FOREIGN KEY (customer\_id) REFERENCES dbo.CLIENTES(CODCLIENTE)
);
GO

\-- Tabla de Encabezados de Pedidos
IF OBJECT\_ID('RIP.APP\_PEDIDOS', 'U') IS NULL
CREATE TABLE RIP.APP\_PEDIDOS (
id INT IDENTITY(1,1) PRIMARY KEY,
order\_number AS 'ORD-' + RIGHT('00000000' + CAST(id AS VARCHAR(8)), 8) PERSISTED,
customer\_id INT NOT NULL,
truck\_id INT NOT NULL,
destination\_id INT NULL,
status NVARCHAR(50) NOT NULL DEFAULT 'PENDING',
notes NVARCHAR(MAX),
created\_by INT NOT NULL,
created\_at DATETIME NOT NULL DEFAULT GETDATE(),
updated\_at DATETIME NOT NULL DEFAULT GETDATE(),
FOREIGN KEY (customer\_id) REFERENCES dbo.CLIENTES(CODCLIENTE),
FOREIGN KEY (truck\_id) REFERENCES RIP.APP\_CAMIONES(id),
FOREIGN KEY (created\_by) REFERENCES RIP.APP\_USUARIOS(id),
FOREIGN KEY (destination\_id) REFERENCES RIP.APP\_DESTINOS(id)
);
GO

\-- Tabla de Líneas/Items de Pedidos (Actualizada)
IF OBJECT\_ID('RIP.APP\_PEDIDOS\_ITEMS', 'U') IS NULL
CREATE TABLE RIP.APP\_PEDIDOS\_ITEMS (
id INT IDENTITY(1,1) PRIMARY KEY,
order\_id INT NOT NULL,
product\_id INT NOT NULL,
quantity DECIMAL(18, 2) NOT NULL,
price\_per\_unit DECIMAL(18, 2) NOT NULL,
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

\-- 3. CREACIÓN DE VISTAS
\-- Se crean las vistas que sirven de 'puente' al sistema principal.

-----

\-- Vista de Clientes
CREATE OR ALTER VIEW RIP.VW\_APP\_CLIENTES AS
SELECT
CODCLIENTE AS id,
NOMBRECLIENTE AS name,
NIF20 AS rfc,
DIRECCION1 AS address,
TELEFONO1 AS phone,
E\_MAIL AS email,
CASE WHEN DESCATALOGADO = 'F' THEN 1 ELSE 0 END AS is\_active
FROM
dbo.CLIENTES;
GO

\-- Vista de Productos (con lógica de último precio como referencia)
CREATE OR ALTER VIEW RIP.VW\_APP\_PRODUCTOS AS
WITH ULTIMOS\_PRECIOS AS (
SELECT
L.CODARTICULO,
L.PRECIO,
ROW\_NUMBER() OVER(PARTITION BY L.CODARTICULO ORDER BY C.FECHA DESC, C.NUMALBARAN DESC) AS RN
FROM
dbo.ALBVENTALIN L
INNER JOIN
dbo.ALBVENTACAB C ON L.NUMSERIE = C.NUMSERIE AND L.NUMALBARAN = C.NUMALBARAN AND L.N = C.N
WHERE
L.PRECIO \> 0
)
SELECT
A.CODARTICULO AS id,
A.REFPROVEEDOR AS codigo,
A.DESCRIPCION AS name,
NULL AS description,
ISNULL(P.PRECIO, 0.00) AS price\_per\_unit,
A.UNIDADMEDIDA AS unit,
CASE WHEN A.DESCATALOGADO = 'F' THEN 1 ELSE 0 END AS is\_active
FROM
dbo.ARTICULOS A
LEFT JOIN
ULTIMOS\_PRECIOS P ON A.CODARTICULO = P.CODARTICULO AND P.RN = 1;
GO

PRINT '¡Despliegue completado\! El esquema, las tablas y las vistas han sido creados/actualizados.';