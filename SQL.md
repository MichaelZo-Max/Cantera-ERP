-- =================================================================
-- SCRIPT DE DESPLIEGUE A PRODUCCIÓN (Versión Corregida y Verificada)
-- Propósito: Crea y ajusta el esquema, tablas, funciones y vistas para el aplicativo.
-- Este script es idempotente y utiliza DROP/CREATE para máxima compatibilidad.
-- =================================================================

-- 1. CREACIÓN DEL ESQUEMA
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'RIP')
BEGIN
    EXEC('CREATE SCHEMA RIP');
    PRINT 'Esquema RIP creado.';
END
GO

-- 2. CREACIÓN DE TABLAS
-- Se crean o actualizan las tablas en orden de dependencia.

-- Tabla de Usuarios (Sin FK circular inicialmente)
IF OBJECT_ID('RIP.APP_USUARIOS', 'U') IS NULL
BEGIN
    CREATE TABLE RIP.APP_USUARIOS (
        id INT IDENTITY(1,1) PRIMARY KEY,
        email NVARCHAR(255) NOT NULL UNIQUE,
        name NVARCHAR(255) NOT NULL,
        role NVARCHAR(50) NOT NULL CHECK (role IN ('CASHIER', 'YARD', 'SECURITY', 'ADMIN', 'REPORTS')),
        password_hash NVARCHAR(255) NOT NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE(),
        cashier_order_id INT NULL, -- Se añade la columna, pero la FK se crea después
        CODVENDEDOR INT NULL,
        FOREIGN KEY (CODVENDEDOR) REFERENCES dbo.VENDEDORES(CODVENDEDOR)
    );
    PRINT 'Tabla RIP.APP_USUARIOS creada.';
END
GO

-- Tabla de Choferes
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
    PRINT 'Tabla RIP.APP_CHOFERES creada.';
END
GO

-- Tabla de Camiones
IF OBJECT_ID('RIP.APP_CAMIONES', 'U') IS NULL
BEGIN
    CREATE TABLE RIP.APP_CAMIONES (
        id INT IDENTITY(1,1) PRIMARY KEY,
        placa NVARCHAR(20) NOT NULL UNIQUE,
        brand NVARCHAR(100),
        model NVARCHAR(100),
        capacity DECIMAL(18, 2) NOT NULL,
        driver_id INT NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_APP_CAMIONES_CHOFERES FOREIGN KEY (driver_id) REFERENCES RIP.APP_CHOFERES(id)
    );
    PRINT 'Tabla RIP.APP_CAMIONES creada.';
END
GO

-- Tabla de Destinos
IF OBJECT_ID('RIP.APP_DESTINOS', 'U') IS NULL
BEGIN
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
    PRINT 'Tabla RIP.APP_DESTINOS creada.';
END
GO

-- Tabla de Encabezados de Pedidos (Modificada para no tener factura única)
PRINT 'Verificando y actualizando la tabla RIP.APP_PEDIDOS...';
-- Eliminar la clave foránea antigua si existe
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[RIP].[FK_APP_PEDIDOS_FACTURASVENTA]'))
BEGIN
    ALTER TABLE RIP.APP_PEDIDOS DROP CONSTRAINT FK_APP_PEDIDOS_FACTURASVENTA;
    PRINT ' -> Restricción FK_APP_PEDIDOS_FACTURASVENTA (antigua) eliminada.';
END
GO
-- Eliminar las columnas de factura antiguas si existen
IF EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'invoice_series' AND Object_ID = Object_ID(N'RIP.APP_PEDIDOS'))
BEGIN
    ALTER TABLE RIP.APP_PEDIDOS DROP COLUMN invoice_series;
    PRINT ' -> Columna "invoice_series" eliminada de APP_PEDIDOS.';
END
GO
IF EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'invoice_number' AND Object_ID = Object_ID(N'RIP.APP_PEDIDOS'))
BEGIN
    ALTER TABLE RIP.APP_PEDIDOS DROP COLUMN invoice_number;
    PRINT ' -> Columna "invoice_number" eliminada de APP_PEDIDOS.';
END
GO
IF EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'invoice_n' AND Object_ID = Object_ID(N'RIP.APP_PEDIDOS'))
BEGIN
    ALTER TABLE RIP.APP_PEDIDOS DROP COLUMN invoice_n;
    PRINT ' -> Columna "invoice_n" eliminada de APP_PEDIDOS.';
END
GO

IF OBJECT_ID('RIP.APP_PEDIDOS', 'U') IS NULL
BEGIN
    CREATE TABLE RIP.APP_PEDIDOS (
        id INT IDENTITY(1,1) PRIMARY KEY,
        order_number AS 'ORD-' + RIGHT('00000000' + CAST(id AS VARCHAR(8)), 8) PERSISTED,
        customer_id INT NOT NULL,
        destination_id INT NULL,
        status NVARCHAR(50) NOT NULL DEFAULT 'PENDING_INVOICE',
        notes NVARCHAR(MAX),
        created_by INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (customer_id) REFERENCES dbo.CLIENTES(CODCLIENTE),
        FOREIGN KEY (created_by) REFERENCES RIP.APP_USUARIOS(id),
        FOREIGN KEY (destination_id) REFERENCES RIP.APP_DESTINOS(id),
        CONSTRAINT CK_APP_PEDIDOS_status CHECK (status IN ('PENDING_INVOICE', 'INVOICED', 'PARTIALLY_DISPATCHED', 'DISPATCHED_COMPLETE', 'CANCELLED'))
    );
    PRINT 'Tabla RIP.APP_PEDIDOS creada.';
END
ELSE
BEGIN
    -- Asegurarse de que la restricción de status esté actualizada
    IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_APP_PEDIDOS_status')
    BEGIN
        ALTER TABLE RIP.APP_PEDIDOS DROP CONSTRAINT CK_APP_PEDIDOS_status;
    END
    ALTER TABLE RIP.APP_PEDIDOS ADD CONSTRAINT CK_APP_PEDIDOS_status CHECK (status IN ('PENDING_INVOICE', 'INVOICED', 'PARTIALLY_DISPATCHED', 'DISPATCHED_COMPLETE', 'CANCELLED'));
    PRINT ' -> Restricción CK_APP_PEDIDOS_status actualizada.';
END
GO

-- Tabla de Líneas/Items de Pedidos
IF OBJECT_ID('RIP.APP_PEDIDOS_ITEMS', 'U') IS NULL
BEGIN
    CREATE TABLE RIP.APP_PEDIDOS_ITEMS (
        id INT IDENTITY(1,1) PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity DECIMAL(18, 2) NOT NULL,
        price_per_unit DECIMAL(18, 2) NOT NULL,
        unit NVARCHAR(50) NULL,
        subtotal AS (quantity * price_per_unit),
        FOREIGN KEY (order_id) REFERENCES RIP.APP_PEDIDOS(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES dbo.ARTICULOS(CODARTICULO)
    );
    PRINT 'Tabla RIP.APP_PEDIDOS_ITEMS creada.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'unit' AND Object_ID = Object_ID(N'RIP.APP_PEDIDOS_ITEMS'))
    BEGIN
        ALTER TABLE RIP.APP_PEDIDOS_ITEMS ADD unit NVARCHAR(50) NULL;
        PRINT 'Columna "unit" añadida a RIP.APP_PEDIDOS_ITEMS.';
    END
END
GO

-- Tabla de Unión Pedidos-Facturas (Muchos a Muchos)
IF OBJECT_ID('RIP.APP_PEDIDOS_FACTURAS', 'U') IS NULL
BEGIN
    CREATE TABLE RIP.APP_PEDIDOS_FACTURAS (
        pedido_id INT NOT NULL,
        invoice_series NVARCHAR(4) COLLATE Latin1_General_CS_AI NOT NULL,
        invoice_number INT NOT NULL,
        invoice_n NCHAR(1) COLLATE Modern_Spanish_CI_AS NOT NULL,
        CONSTRAINT PK_APP_PEDIDOS_FACTURAS PRIMARY KEY (pedido_id, invoice_series, invoice_number, invoice_n),
        CONSTRAINT FK_PEDIDOS_FACTURAS_PEDIDOS FOREIGN KEY (pedido_id) REFERENCES RIP.APP_PEDIDOS(id) ON DELETE CASCADE,
        CONSTRAINT FK_PEDIDOS_FACTURAS_FACTURASVENTA FOREIGN KEY (invoice_series, invoice_number, invoice_n) REFERENCES dbo.FACTURASVENTA(NUMSERIE, NUMFACTURA, N)
    );
    PRINT 'Tabla RIP.APP_PEDIDOS_FACTURAS creada.';
END
GO

-- Tabla de Despachos
IF OBJECT_ID('RIP.APP_DESPACHOS', 'U') IS NULL
BEGIN
    CREATE TABLE RIP.APP_DESPACHOS (
        id INT IDENTITY(1,1) PRIMARY KEY,
        order_id INT NOT NULL,
        truck_id INT NULL,
        driver_id INT NULL,
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
        FOREIGN KEY (truck_id) REFERENCES RIP.APP_CAMIONES(id),
        FOREIGN KEY (driver_id) REFERENCES RIP.APP_CHOFERES(id),
        FOREIGN KEY (loaded_by) REFERENCES RIP.APP_USUARIOS(id),
        FOREIGN KEY (exited_by) REFERENCES RIP.APP_USUARIOS(id)
    );
    PRINT 'Tabla RIP.APP_DESPACHOS creada.';
END
GO

-- Tabla de Detalle de Despachos
IF OBJECT_ID('RIP.APP_DESPACHOS_ITEMS', 'U') IS NULL
BEGIN
    CREATE TABLE RIP.APP_DESPACHOS_ITEMS (
        id INT IDENTITY(1,1) PRIMARY KEY,
        despacho_id INT NOT NULL,
        pedido_item_id INT NOT NULL,
        dispatched_quantity DECIMAL(18, 2) NOT NULL,
        FOREIGN KEY (despacho_id) REFERENCES RIP.APP_DESPACHOS(id) ON DELETE CASCADE,
        FOREIGN KEY (pedido_item_id) REFERENCES RIP.APP_PEDIDOS_ITEMS(id)
    );
    PRINT 'Tabla RIP.APP_DESPACHOS_ITEMS creada.';
END
GO

-- Tabla de Guías de Despacho
IF OBJECT_ID('RIP.APP_GUIAS_DESPACHO', 'U') IS NULL
BEGIN
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
    PRINT 'Tabla RIP.APP_GUIAS_DESPACHO creada.';
END
GO

-- Tabla de Unión Clientes-Choferes (Muchos a Muchos)
IF OBJECT_ID('RIP.APP_CLIENTES_CHOFERES', 'U') IS NULL
BEGIN
    CREATE TABLE RIP.APP_CLIENTES_CHOFERES (
        cliente_id INT NOT NULL,
        chofer_id INT NOT NULL,
        CONSTRAINT FK_CLIENTES_CHOFERES_CLIENTES FOREIGN KEY (cliente_id) REFERENCES dbo.CLIENTES(CODCLIENTE),
        CONSTRAINT FK_CLIENTES_CHOFERES_CHOFERES FOREIGN KEY (chofer_id) REFERENCES RIP.APP_CHOFERES(id),
        CONSTRAINT PK_APP_CLIENTES_CHOFERES PRIMARY KEY (cliente_id, chofer_id)
    );
    PRINT 'Tabla RIP.APP_CLIENTES_CHOFERES creada.';
END
GO

-- Tabla de Unión Pedidos-Camiones (Muchos a Muchos)
IF OBJECT_ID('RIP.APP_PEDIDOS_CAMIONES', 'U') IS NULL
BEGIN
    CREATE TABLE RIP.APP_PEDIDOS_CAMIONES (
        pedido_id INT NOT NULL,
        camion_id INT NOT NULL,
        CONSTRAINT FK_PEDIDOS_CAMIONES_PEDIDOS FOREIGN KEY (pedido_id) REFERENCES RIP.APP_PEDIDOS(id) ON DELETE CASCADE,
        CONSTRAINT FK_PEDIDOS_CAMIONES_CAMIONES FOREIGN KEY (camion_id) REFERENCES RIP.APP_CAMIONES(id) ON DELETE CASCADE,
        CONSTRAINT PK_APP_PEDIDOS_CAMIONES PRIMARY KEY (pedido_id, camion_id)
    );
    PRINT 'Tabla RIP.APP_PEDIDOS_CAMIONES creada.';
END
GO

-- Tabla de Unión Pedidos-Choferes (Muchos a Muchos)
IF OBJECT_ID('RIP.APP_PEDIDOS_CHOFERES', 'U') IS NULL
BEGIN
    CREATE TABLE RIP.APP_PEDIDOS_CHOFERES (
        pedido_id INT NOT NULL,
        chofer_id INT NOT NULL,
        CONSTRAINT FK_PEDIDOS_CHOFERES_PEDIDOS FOREIGN KEY (pedido_id) REFERENCES RIP.APP_PEDIDOS(id) ON DELETE CASCADE,
        CONSTRAINT FK_PEDIDOS_CHOFERES_CHOFERES FOREIGN KEY (chofer_id) REFERENCES RIP.APP_CHOFERES(id) ON DELETE CASCADE,
        CONSTRAINT PK_APP_PEDIDOS_CHOFERES PRIMARY KEY (pedido_id, chofer_id)
    );
    PRINT 'Tabla RIP.APP_PEDIDOS_CHOFERES creada.';
END
GO

-- TABLAS PARA ÓRDENES DE CAJA SIN FACTURA PREVIA
IF OBJECT_ID('RIP.APP_ORDENES_SIN_FACTURA_CAB', 'U') IS NULL
BEGIN
    CREATE TABLE RIP.APP_ORDENES_SIN_FACTURA_CAB (
        id INT IDENTITY(1,1) PRIMARY KEY,
        order_number AS 'VTA-' + RIGHT('00000000' + CAST(id AS VARCHAR(8)), 8) PERSISTED,
        customer_id INT NOT NULL,
        customer_doc_id NVARCHAR(20) NULL,
        total_usd DECIMAL(18, 2) NOT NULL,
        exchange_rate DECIMAL(18, 4) NULL,
        status NVARCHAR(50) NOT NULL DEFAULT 'PENDING_INVOICE' CHECK (status IN ('PENDING_INVOICE', 'INVOICED', 'CANCELLED')),
        created_by INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (customer_id) REFERENCES dbo.CLIENTES(CODCLIENTE),
        FOREIGN KEY (created_by) REFERENCES RIP.APP_USUARIOS(id)
    );
    PRINT 'Tabla RIP.APP_ORDENES_SIN_FACTURA_CAB creada.';
END
GO

IF OBJECT_ID('RIP.APP_ORDENES_SIN_FACTURA_ITEMS', 'U') IS NULL
BEGIN
    CREATE TABLE RIP.APP_ORDENES_SIN_FACTURA_ITEMS (
        id INT IDENTITY(1,1) PRIMARY KEY,
        order_cab_id INT NOT NULL,
        product_id INT NOT NULL,
        product_ref NVARCHAR(50) NULL,
        product_name NVARCHAR(255) NOT NULL,
        quantity DECIMAL(18, 2) NOT NULL,
        price_per_unit_usd DECIMAL(18, 2) NOT NULL,
        subtotal_usd AS (quantity * price_per_unit_usd),
        FOREIGN KEY (order_cab_id) REFERENCES RIP.APP_ORDENES_SIN_FACTURA_CAB(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES dbo.ARTICULOS(CODARTICULO)
    );
    PRINT 'Tabla RIP.APP_ORDENES_SIN_FACTURA_ITEMS creada.';
END
GO

-- TABLA DE UNIÓN PARA ÓRDENES DE CAJA Y FACTURAS
IF OBJECT_ID('RIP.APP_ORDENES_SIN_FACTURA_FACTURAS', 'U') IS NULL
BEGIN
    CREATE TABLE RIP.APP_ORDENES_SIN_FACTURA_FACTURAS (
        orden_id INT NOT NULL,
        invoice_series NVARCHAR(4) COLLATE Latin1_General_CS_AI NOT NULL,
        invoice_number INT NOT NULL,
        invoice_n NCHAR(1) COLLATE Modern_Spanish_CI_AS NOT NULL,
        CONSTRAINT PK_APP_ORDENES_FACTURAS PRIMARY KEY (orden_id, invoice_series, invoice_number, invoice_n),
        CONSTRAINT FK_ORDENES_FACTURAS_ORDENES FOREIGN KEY (orden_id) 
            REFERENCES RIP.APP_ORDENES_SIN_FACTURA_CAB(id) ON DELETE CASCADE,
        CONSTRAINT FK_ORDENES_FACTURAS_FACTURASVENTA FOREIGN KEY (invoice_series, invoice_number, invoice_n) 
            REFERENCES dbo.FACTURASVENTA(NUMSERIE, NUMFACTURA, N)
    );
    PRINT 'Tabla de unión RIP.APP_ORDENES_SIN_FACTURA_FACTURAS creada.';
END
GO

-- LIMPIEZA DE COLUMNA REDUNDANTE 'related_invoice_n'
IF EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'related_invoice_n' AND Object_ID = Object_ID(N'RIP.APP_ORDENES_SIN_FACTURA_CAB'))
BEGIN
    ALTER TABLE RIP.APP_ORDENES_SIN_FACTURA_CAB DROP COLUMN related_invoice_n;
    PRINT 'Columna "related_invoice_n" eliminada de RIP.APP_ORDENES_SIN_FACTURA_CAB.';
END
GO

-- !! CORRECCIÓN DE REFERENCIA CIRCULAR (Versión Robusta) !!
-- Paso 1: Asegurarse de que la columna 'cashier_order_id' exista en la tabla de usuarios.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'cashier_order_id' AND Object_ID = Object_ID(N'RIP.APP_USUARIOS'))
BEGIN
    ALTER TABLE RIP.APP_USUARIOS ADD cashier_order_id INT NULL;
    PRINT 'Columna "cashier_order_id" que faltaba fue añadida a RIP.APP_USUARIOS.';
END
GO

-- Paso 2: Crear la clave foránea ahora que la columna existe garantizado.
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'RIP.FK_USUARIOS_ORDEN_CAJA') AND parent_object_id = OBJECT_ID(N'RIP.APP_USUARIOS'))
BEGIN
    ALTER TABLE RIP.APP_USUARIOS ADD CONSTRAINT FK_USUARIOS_ORDEN_CAJA FOREIGN KEY (cashier_order_id) REFERENCES RIP.APP_ORDENES_SIN_FACTURA_CAB(id);
    PRINT 'FK para referencia circular (APP_USUARIOS -> APP_ORDENES_SIN_FACTURA_CAB) creada.';
END
GO

-- 3. CREACIÓN DE FUNCIONES
IF OBJECT_ID('[rip].[F_GET_COTIZACION_RIP]', 'FN') IS NOT NULL
BEGIN
    DROP FUNCTION [rip].[F_GET_COTIZACION_RIP];
END
GO

CREATE FUNCTION [rip].[F_GET_COTIZACION_RIP](
    @IMPORTE FLOAT, 
    @FECHA DATE, 
    @FACTOR_REAL FLOAT, 
    @ORIGEN INT, 
    @DESTINO INT
)
RETURNS FLOAT
AS
BEGIN
    DECLARE @VALOR FLOAT;
    DECLARE @MULTIPLICO AS NCHAR(1) = (SELECT NUMERADOR FROM MONEDAS WITH(NOLOCK) WHERE CODMONEDA = @DESTINO);
    
    SELECT 
        @VALOR = CASE      
            WHEN @ORIGEN = @DESTINO THEN @IMPORTE
            WHEN @ORIGEN <> @DESTINO AND @MULTIPLICO = 'F' THEN @IMPORTE * @FACTOR_REAL * dbo.F_GET_COTIZACION(@FECHA, @DESTINO)
            ELSE @IMPORTE * @FACTOR_REAL / dbo.F_GET_COTIZACION(@FECHA, @DESTINO)
        END;

    RETURN(@VALOR);
END
GO
PRINT 'Función [rip].[F_GET_COTIZACION_RIP] creada/actualizada.';
GO

-- 4. CREACIÓN DE VISTAS
IF OBJECT_ID('RIP.VW_APP_CLIENTES', 'V') IS NOT NULL
BEGIN
    DROP VIEW RIP.VW_APP_CLIENTES;
END
GO

CREATE VIEW RIP.VW_APP_CLIENTES AS
SELECT
    CODCLIENTE AS id, NOMBRECLIENTE AS name, NIF20 AS rfc,
    DIRECCION1 AS address, TELEFONO1 AS phone, E_MAIL AS email,
    CASE WHEN DESCATALOGADO = 'F' THEN 1 ELSE 0 END AS is_active
FROM
    dbo.CLIENTES;
GO

IF OBJECT_ID('RIP.VW_APP_PRODUCTOS', 'V') IS NOT NULL
BEGIN
    DROP VIEW RIP.VW_APP_PRODUCTOS;
END
GO

CREATE VIEW RIP.VW_APP_PRODUCTOS AS
WITH ULTIMOS_PRECIOS AS (
    SELECT
        L.CODARTICULO, L.PRECIO,
        ROW_NUMBER() OVER(PARTITION BY L.CODARTICULO ORDER BY C.FECHA DESC, C.NUMALBARAN DESC) AS RN
    FROM dbo.ALBVENTALIN L
    INNER JOIN dbo.ALBVENTACAB C ON L.NUMSERIE = C.NUMSERIE AND L.NUMALBARAN = C.NUMALBARAN AND L.N = C.N
    WHERE L.PRECIO > 0
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

IF OBJECT_ID('RIP.VW_APP_PEDIDOS', 'V') IS NOT NULL
BEGIN
    DROP VIEW RIP.VW_APP_PEDIDOS;
END
GO

CREATE VIEW RIP.VW_APP_PEDIDOS AS
SELECT
    p.id,
    p.order_number,
    p.customer_id,
    c.NOMBRECLIENTE AS customer_name,
    p.destination_id,
    d.name AS destination_name,
    p.status,
    p.notes,
    p.created_by,
    u.name AS created_by_name,
    p.created_at,
    p.updated_at,
    (
        SELECT
            pf.invoice_series,
            pf.invoice_number,
            pf.invoice_n,
            ISNULL(pf.invoice_series + '-' + CAST(pf.invoice_number AS VARCHAR) + pf.invoice_n COLLATE DATABASE_DEFAULT, '') AS invoice_full_number
        FROM RIP.APP_PEDIDOS_FACTURAS pf
        WHERE pf.pedido_id = p.id
        FOR JSON PATH
    ) AS invoices
FROM
    RIP.APP_PEDIDOS p
JOIN
    dbo.CLIENTES c ON p.customer_id = c.CODCLIENTE
LEFT JOIN
    RIP.APP_DESTINOS d ON p.destination_id = d.id
LEFT JOIN
    RIP.APP_USUARIOS u ON p.created_by = u.id;
GO

IF OBJECT_ID('RIP.VW_APP_DESPACHOS', 'V') IS NOT NULL
BEGIN
    DROP VIEW RIP.VW_APP_DESPACHOS;
END
GO

CREATE VIEW RIP.VW_APP_DESPACHOS AS
SELECT
    d.id,
    d.order_id,
    vp.invoices AS order_invoices,
    d.truck_id,
    d.driver_id,
    d.status AS estado,
    d.created_at,
    d.updated_at,
    d.notes,
    d.loaded_at AS loadedAt,
    d.load_photo_url AS loadPhoto,
    d.exited_at AS exitedAt,
    d.exit_photo_url AS exitPhoto,
    (SELECT * FROM RIP.VW_APP_PEDIDOS vpo WHERE vpo.id = d.order_id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) AS orderDetails,
    (SELECT t.id, t.placa, t.brand, t.model, t.capacity FROM RIP.APP_CAMIONES t WHERE t.id = d.truck_id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) AS truck,
    (SELECT dr.id, dr.name, dr.docId FROM RIP.APP_CHOFERES dr WHERE dr.id = d.driver_id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) AS driver
FROM
    RIP.APP_DESPACHOS d
JOIN
    RIP.VW_APP_PEDIDOS vp ON d.order_id = vp.id;
GO

IF OBJECT_ID('RIP.VW_APP_PEDIDOS_CON_TRANSPORTE', 'V') IS NOT NULL
BEGIN
    DROP VIEW RIP.VW_APP_PEDIDOS_CON_TRANSPORTE;
END
GO

CREATE VIEW RIP.VW_APP_PEDIDOS_CON_TRANSPORTE AS
SELECT
    p.id,
    p.order_number,
    p.status,
    p.customer_id,
    c.NOMBRECLIENTE as customer_name,
    p.created_at,
    vp.invoices AS invoices,
    (
        SELECT
            cam.id, cam.placa, cam.brand, cam.model
        FROM RIP.APP_PEDIDOS_CAMIONES pc
        JOIN RIP.APP_CAMIONES cam ON pc.camion_id = cam.id
        WHERE pc.pedido_id = p.id
        FOR JSON PATH
    ) AS authorized_trucks,
    (
        SELECT
            chof.id, chof.name, chof.docId
        FROM RIP.APP_PEDIDOS_CHOFERES pch
        JOIN RIP.APP_CHOFERES chof ON pch.chofer_id = chof.id
        WHERE pch.pedido_id = p.id
        FOR JSON PATH
    ) AS authorized_drivers
FROM
    RIP.APP_PEDIDOS p
JOIN
    dbo.CLIENTES c ON p.customer_id = c.CODCLIENTE
LEFT JOIN
    RIP.VW_APP_PEDIDOS vp ON p.id = vp.id;
GO

IF OBJECT_ID('RIP.VW_APP_FACTURAS_DISPONIBLES', 'V') IS NOT NULL
BEGIN
    DROP VIEW RIP.VW_APP_FACTURAS_DISPONIBLES;
END
GO

CREATE VIEW RIP.VW_APP_FACTURAS_DISPONIBLES AS
SELECT
    FV.NUMSERIE AS invoice_series,
    FV.NUMFACTURA AS invoice_number,
    FV.N AS invoice_n,
    C.CODCLIENTE AS customer_id,
    C.NOMBRECLIENTE AS customer_name,
    FV.FECHA AS invoice_date,
    ROUND(RIP.F_GET_COTIZACION_RIP(FV.TOTALNETO, FV.FECHA, FV.FACTORMONEDA, FV.CODMONEDA, 1), 2) AS total_usd
FROM
    dbo.FACTURASVENTA FV
INNER JOIN
    dbo.CLIENTES C ON FV.CODCLIENTE = C.CODCLIENTE;
GO
PRINT 'Vista RIP.VW_APP_FACTURAS_DISPONIBLES creada/actualizada.';
GO

IF OBJECT_ID('RIP.VW_APP_FACTURA_ITEMS', 'V') IS NOT NULL
BEGIN
    DROP VIEW RIP.VW_APP_FACTURA_ITEMS;
END
GO

CREATE VIEW RIP.VW_APP_FACTURA_ITEMS AS
SELECT
    FV.NUMSERIE AS invoice_series,
    FV.NUMFACTURA AS invoice_number,
    FV.N AS invoice_n,
    A.CODARTICULO AS id,
    A.REFPROVEEDOR AS codigo,
    A.DESCRIPCION AS name,
    CASE
        WHEN A.UNIDADMEDIDA IN ('m3', 'Ton', 'kg') THEN 'GRANEL'
        WHEN A.UNIDADMEDIDA IN ('SACO', 'BOLSA', 'CUÑETE') THEN 'PAQUETE'
        WHEN A.FAMILIA LIKE '%SERVICIO%' THEN 'SERVICIO'
        ELSE 'UNIDAD'
    END AS sell_format,
    ROUND(RIP.F_GET_COTIZACION_RIP(AVL.PRECIO, FV.FECHA, FV.FACTORMONEDA, FV.CODMONEDA, 1), 2) AS price_per_unit_usd,
    SUM(AVL.UNIDADESTOTAL) AS quantity,
    A.UNIDADMEDIDA AS unit,
    CASE WHEN A.DESCATALOGADO = 'F' THEN 1 ELSE 0 END AS is_active
FROM
    dbo.FACTURASVENTA FV
JOIN
    dbo.ALBVENTACAB AVC ON FV.NUMSERIE = AVC.NUMSERIEFAC AND FV.NUMFACTURA = AVC.NUMFAC AND FV.N = AVC.N
JOIN
    dbo.ALBVENTALIN AVL ON AVC.NUMSERIE = AVL.NUMSERIE AND AVC.NUMALBARAN = AVL.NUMALBARAN AND AVC.N = AVL.N
JOIN
    dbo.ARTICULOS A ON AVL.CODARTICULO = A.CODARTICULO
GROUP BY
    FV.NUMSERIE,
    FV.NUMFACTURA,
    FV.N,
    A.CODARTICULO,
    A.REFPROVEEDOR,
    A.DESCRIPCION,
    CASE
        WHEN A.UNIDADMEDIDA IN ('m3', 'Ton', 'kg') THEN 'GRANEL'
        WHEN A.UNIDADMEDIDA IN ('SACO', 'BOLSA', 'CUÑETE') THEN 'PAQUETE'
        WHEN A.FAMILIA LIKE '%SERVICIO%' THEN 'SERVICIO'
        ELSE 'UNIDAD'
    END,
    FV.FECHA,
    FV.FACTORMONEDA,
    FV.CODMONEDA,
    AVL.PRECIO,
    A.UNIDADMEDIDA,
    A.DESCATALOGADO;
GO
PRINT 'Vista RIP.VW_APP_FACTURA_ITEMS creada/actualizada con precios en USD.';
GO

-- !! VISTA CORREGIDA !!: Lógica de cálculo de pendientes ajustada.
IF OBJECT_ID('RIP.VW_APP_FACTURA_ITEMS_PENDIENTES', 'V') IS NOT NULL
BEGIN
    DROP VIEW RIP.VW_APP_FACTURA_ITEMS_PENDIENTES;
END
GO

IF OBJECT_ID('RIP.VW_APP_FACTURA_ITEMS_PENDIENTES', 'V') IS NOT NULL
BEGIN
    DROP VIEW RIP.VW_APP_FACTURA_ITEMS_PENDIENTES;
END
GO

CREATE VIEW RIP.VW_APP_FACTURA_ITEMS_PENDIENTES AS
-- CTE para calcular el total despachado por producto a través de todos los pedidos
WITH CantidadDespachada AS (
    SELECT
        pi.product_id,
        SUM(di.dispatched_quantity) AS total_dispatched
    FROM RIP.APP_DESPACHOS_ITEMS di
    JOIN RIP.APP_PEDIDOS_ITEMS pi ON di.pedido_item_id = pi.id
    GROUP BY pi.product_id
)
SELECT
    fi.invoice_series,
    fi.invoice_number,
    fi.invoice_n,
    fi.id AS product_id,
    fi.codigo AS product_code,
    fi.name AS product_name,
    fi.price_per_unit_usd AS price_per_unit,
    fi.unit,
    fi.quantity AS total_quantity_in_invoice,
    ISNULL(cd.total_dispatched, 0) AS dispatched_quantity,
    (fi.quantity - ISNULL(cd.total_dispatched, 0)) AS quantity_pending
FROM
    RIP.VW_APP_FACTURA_ITEMS fi
LEFT JOIN
    CantidadDespachada cd ON fi.id = cd.product_id
WHERE
    (fi.quantity - ISNULL(cd.total_dispatched, 0)) > 0;
GO

PRINT 'Vista RIP.VW_APP_FACTURA_ITEMS_PENDIENTES corregida y actualizada.';
GO

-- Reemplazar el procedimiento almacenado existente
IF OBJECT_ID('RIP.SP_InvoiceCashierOrder', 'P') IS NOT NULL
BEGIN
    DROP PROCEDURE RIP.SP_InvoiceCashierOrder;
    PRINT 'Procedimiento almacenado RIP.SP_InvoiceCashierOrder eliminado para ser reemplazado.';
END
GO

CREATE PROCEDURE RIP.SP_InvoiceCashierOrder
    @CashierOrderId INT,
    @RelatedOrderId INT, -- <-- NUEVO PARÁMETRO para el ID del pedido relacionado (el ORD-)
    @InvoiceIdsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRANSACTION;
    BEGIN TRY

        -- Primero, validamos que el Pedido relacionado que nos pasaron realmente existe
        IF NOT EXISTS (SELECT 1 FROM RIP.APP_PEDIDOS WHERE id = @RelatedOrderId)
        BEGIN
            -- Si no existe, cancelamos todo y devolvemos un error claro.
            ;THROW 50001, 'El ID del pedido relacionado (RelatedOrderId) no existe en la tabla APP_PEDIDOS.', 1;
        END

        -- Parseamos los identificadores de las facturas desde el JSON
        DECLARE @ParsedInvoices TABLE (
            series NVARCHAR(10),
            number INT,
            n NCHAR(1)
        );
        INSERT INTO @ParsedInvoices (series, number, n)
        SELECT
            PARSENAME(REPLACE(value, '|', '.'), 3),
            CAST(PARSENAME(REPLACE(value, '|', '.'), 2) AS INT),
            PARSENAME(REPLACE(value, '|', '.'), 1)
        FROM OPENJSON(@InvoiceIdsJson)
        WHERE value LIKE '%|%|%';

        -- Validamos que se haya proporcionado al menos una factura
        IF NOT EXISTS (SELECT 1 FROM @ParsedInvoices)
        BEGIN
            ;THROW 50002, 'No se proporcionaron IDs de factura válidos en el JSON.', 1;
        END

        -- =================================================================
        -- PASO 1: VINCULAR LAS FACTURAS AL PEDIDO PRINCIPAL (ORD-)
        -- =================================================================
        INSERT INTO RIP.APP_PEDIDOS_FACTURAS (pedido_id, invoice_series, invoice_number, invoice_n)
        SELECT @RelatedOrderId, series, number, n FROM @ParsedInvoices;

        -- =================================================================
        -- PASO 2: ACTUALIZAR EL ESTADO DEL PEDIDO PRINCIPAL (ORD-)
        -- =================================================================
        UPDATE RIP.APP_PEDIDOS
        SET status = 'INVOICED' -- Marcamos el pedido como facturado
        WHERE id = @RelatedOrderId;

        -- =================================================================
        -- PASO 3: ACTUALIZAR LA ORDEN DE CAJA ORIGINAL (VTA-)
        -- =================================================================
        UPDATE RIP.APP_ORDENES_SIN_FACTURA_CAB
        SET status = 'INVOICED' -- Marcamos también la orden de caja como facturada
        WHERE id = @CashierOrderId;
        
        IF @@ROWCOUNT = 0
        BEGIN
            ;THROW 50003, 'No se encontró la orden de caja para actualizar.', 1;
        END
        
        -- Mantenemos también la relación en la tabla de la orden de caja por consistencia
        INSERT INTO RIP.APP_ORDENES_SIN_FACTURA_FACTURAS (orden_id, invoice_series, invoice_number, invoice_n)
        SELECT @CashierOrderId, series, number, n FROM @ParsedInvoices;


        COMMIT TRANSACTION;
        PRINT 'Operación completada exitosamente.';

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        -- Re-lanzamos el error para que la aplicación que llamó al SP lo reciba
        ;THROW;
    END CATCH
END
GO
PRINT 'Procedimiento almacenado RIP.SP_InvoiceCashierOrder actualizado para modificar pedidos existentes.';
GO

-- 6. CREACIÓN DE ÍNDICES DE RENDIMIENTO
PRINT 'Creando/Verificando índices de rendimiento...';
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_APP_DESPACHOS_status' AND object_id = OBJECT_ID('RIP.APP_DESPACHOS'))
BEGIN
    CREATE INDEX IX_APP_DESPACHOS_status ON RIP.APP_DESPACHOS(status);
END
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_APP_DESPACHOS_order_id' AND object_id = OBJECT_ID('RIP.APP_DESPACHOS'))
BEGIN
    CREATE INDEX IX_APP_DESPACHOS_order_id ON RIP.APP_DESPACHOS(order_id);
END
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_APP_DESPACHOS_truck_id' AND object_id = OBJECT_ID('RIP.APP_DESPACHOS'))
BEGIN
    CREATE INDEX IX_APP_DESPACHOS_truck_id ON RIP.APP_DESPACHOS(truck_id);
END
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_APP_DESPACHOS_driver_id' AND object_id = OBJECT_ID('RIP.APP_DESPACHOS'))
BEGIN
    CREATE INDEX IX_APP_DESPACHOS_driver_id ON RIP.APP_DESPACHOS(driver_id);
END
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_APP_PEDIDOS_customer_id' AND object_id = OBJECT_ID('RIP.APP_PEDIDOS'))
BEGIN
    CREATE INDEX IX_APP_PEDIDOS_customer_id ON RIP.APP_PEDIDOS(customer_id);
END
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_APP_PEDIDOS_status' AND object_id = OBJECT_ID('RIP.APP_PEDIDOS'))
BEGIN
    CREATE INDEX IX_APP_PEDIDOS_status ON RIP.APP_PEDIDOS(status);
END
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_APP_PEDIDOS_ITEMS_order_id' AND object_id = OBJECT_ID('RIP.APP_PEDIDOS_ITEMS'))
BEGIN
    CREATE INDEX IX_APP_PEDIDOS_ITEMS_order_id ON RIP.APP_PEDIDOS_ITEMS(order_id);
END
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_APP_PEDIDOS_ITEMS_product_id' AND object_id = OBJECT_ID('RIP.APP_PEDIDOS_ITEMS'))
BEGIN
    CREATE INDEX IX_APP_PEDIDOS_ITEMS_product_id ON RIP.APP_PEDIDOS_ITEMS(product_id);
END
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_APP_DESPACHOS_ITEMS_despacho_id' AND object_id = OBJECT_ID('RIP.APP_DESPACHOS_ITEMS'))
BEGIN
    CREATE INDEX IX_APP_DESPACHOS_ITEMS_despacho_id ON RIP.APP_DESPACHOS_ITEMS(despacho_id);
END
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_APP_DESPACHOS_ITEMS_pedido_item_id' AND object_id = OBJECT_ID('RIP.APP_DESPACHOS_ITEMS'))
BEGIN
    CREATE INDEX IX_APP_DESPACHOS_ITEMS_pedido_item_id ON RIP.APP_DESPACHOS_ITEMS(pedido_item_id);
END
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_APP_PEDIDOS_FACTURAS_pedido_id' AND object_id = OBJECT_ID('RIP.APP_PEDIDOS_FACTURAS'))
BEGIN
    CREATE INDEX IX_APP_PEDIDOS_FACTURAS_pedido_id ON RIP.APP_PEDIDOS_FACTURAS(pedido_id);
END
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_APP_PEDIDOS_CAMIONES_pedido_id' AND object_id = OBJECT_ID('RIP.APP_PEDIDOS_CAMIONES'))
BEGIN
    CREATE INDEX IX_APP_PEDIDOS_CAMIONES_pedido_id ON RIP.APP_PEDIDOS_CAMIONES(pedido_id);
END
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_APP_PEDIDOS_CHOFERES_pedido_id' AND object_id = OBJECT_ID('RIP.APP_PEDIDOS_CHOFERES'))
BEGIN
    CREATE INDEX IX_APP_PEDIDOS_CHOFERES_pedido_id ON RIP.APP_PEDIDOS_CHOFERES(pedido_id);
END
GO

PRINT '¡Índices de rendimiento creados correctamente!';
GO

PRINT '====================================================================================';
PRINT '¡Despliegue completado! El script corregido se ha ejecutado.';
PRINT '====================================================================================';
GO

-- PASO 1: AÑADIR COLUMNA PARA VINCULAR LA ORDEN DE CAJA CON EL PEDIDO PRINCIPAL
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'related_order_id' AND Object_ID = Object_ID(N'RIP.APP_ORDENES_SIN_FACTURA_CAB'))
BEGIN
    ALTER TABLE RIP.APP_ORDENES_SIN_FACTURA_CAB
    ADD related_order_id INT NULL;

    PRINT 'Columna "related_order_id" añadida a RIP.APP_ORDENES_SIN_FACTURA_CAB.';
    
    -- Opcional: Crear una referencia (foreign key) para mantener la integridad
    ALTER TABLE RIP.APP_ORDENES_SIN_FACTURA_CAB
    ADD CONSTRAINT FK_ORDEN_CAJA_PEDIDO FOREIGN KEY (related_order_id) REFERENCES RIP.APP_PEDIDOS(id);
    
    PRINT 'Se añadió la llave foránea para related_order_id.';
END
GO
ALTER TABLE RIP.APP_DESPACHOS
ADD exit_load_photo_url NVARCHAR(255) NULL;

-- Creación de la tabla de eventos con las referencias correctas
IF OBJECT_ID('RIP.EventLog', 'U') IS NULL
BEGIN
    CREATE TABLE RIP.EventLog (
        Id INT PRIMARY KEY IDENTITY(1,1),
        OrderId INT NULL,
        DeliveryId INT NULL,
        UserId INT NOT NULL,
        EventType NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),

        -- 👇 CORRECCIONES APLICADAS AQUÍ 👇
        CONSTRAINT FK_EventLog_Pedidos FOREIGN KEY (OrderId) REFERENCES RIP.APP_PEDIDOS(id),
        CONSTRAINT FK_EventLog_Despachos FOREIGN KEY (DeliveryId) REFERENCES RIP.APP_DESPACHOS(id),
        CONSTRAINT FK_EventLog_Usuarios FOREIGN KEY (UserId) REFERENCES RIP.APP_USUARIOS(id)
    );
    PRINT 'Tabla RIP.EventLog creada exitosamente con todas sus referencias.';
END
ELSE
BEGIN
    PRINT 'La tabla RIP.EventLog ya existe.';
END
GO