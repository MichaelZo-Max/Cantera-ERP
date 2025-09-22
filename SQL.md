-- =================================================================
-- SCRIPT DE DESPLIEGUE A PRODUCCIÓN (Versión Final con Sintaxis Clásica)
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

-- Tabla de Usuarios
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

-- Tabla de Encabezados de Pedidos
IF OBJECT_ID('RIP.APP_PEDIDOS', 'U') IS NULL
BEGIN
    CREATE TABLE RIP.APP_PEDIDOS (
        id INT IDENTITY(1,1) PRIMARY KEY,
        order_number AS 'ORD-' + RIGHT('00000000' + CAST(id AS VARCHAR(8)), 8) PERSISTED,
        customer_id INT NOT NULL,
        destination_id INT NULL,
        status NVARCHAR(50) NOT NULL DEFAULT 'AWAITING_PAYMENT',
        notes NVARCHAR(MAX),
        created_by INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE(),
        invoice_series NVARCHAR(4) COLLATE Latin1_General_CS_AI NULL,
        invoice_number INT NULL,
        invoice_n NCHAR(1) COLLATE Modern_Spanish_CI_AS NULL,
        FOREIGN KEY (customer_id) REFERENCES dbo.CLIENTES(CODCLIENTE),
        FOREIGN KEY (created_by) REFERENCES RIP.APP_USUARIOS(id),
        FOREIGN KEY (destination_id) REFERENCES RIP.APP_DESTINOS(id),
        CONSTRAINT CK_APP_PEDIDOS_status CHECK (status IN ('AWAITING_PAYMENT', 'PAID', 'PARTIALLY_DISPATCHED', 'DISPATCHED_COMPLETE', 'CANCELLED')),
        CONSTRAINT FK_APP_PEDIDOS_FACTURASVENTA FOREIGN KEY (invoice_series, invoice_number, invoice_n) REFERENCES dbo.FACTURASVENTA(NUMSERIE, NUMFACTURA, N)
    );
    PRINT 'Tabla RIP.APP_PEDIDOS creada.';
END
ELSE
BEGIN
    PRINT 'Tabla RIP.APP_PEDIDOS ya existe. Verificando y aplicando actualizaciones...';
    
    IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_APP_PEDIDOS_status')
    BEGIN
        ALTER TABLE RIP.APP_PEDIDOS DROP CONSTRAINT CK_APP_PEDIDOS_status;
    END
    ALTER TABLE RIP.APP_PEDIDOS ADD CONSTRAINT CK_APP_PEDIDOS_status CHECK (status IN ('AWAITING_PAYMENT', 'PAID', 'PARTIALLY_DISPATCHED', 'DISPATCHED_COMPLETE', 'CANCELLED'));
    PRINT ' -> Restricción CK_APP_PEDIDOS_status actualizada.';

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'invoice_series' AND Object_ID = Object_ID(N'RIP.APP_PEDIDOS'))
    BEGIN
        ALTER TABLE RIP.APP_PEDIDOS ADD invoice_series NVARCHAR(4) COLLATE Latin1_General_CS_AI NULL;
        PRINT ' -> Columna "invoice_series" añadida.';
    END
    ELSE
    BEGIN
        ALTER TABLE RIP.APP_PEDIDOS ALTER COLUMN invoice_series NVARCHAR(4) COLLATE Latin1_General_CS_AI NULL;
        PRINT ' -> Columna "invoice_series" actualizada a la definición correcta.';
    END

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'invoice_number' AND Object_ID = Object_ID(N'RIP.APP_PEDIDOS'))
    BEGIN
        ALTER TABLE RIP.APP_PEDIDOS ADD invoice_number INT NULL;
        PRINT ' -> Columna "invoice_number" añadida.';
    END

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'invoice_n' AND Object_ID = Object_ID(N'RIP.APP_PEDIDOS'))
    BEGIN
        ALTER TABLE RIP.APP_PEDIDOS ADD invoice_n NCHAR(1) COLLATE Modern_Spanish_CI_AS NULL;
        PRINT ' -> Columna "invoice_n" añadida.';
    END
    ELSE
    BEGIN
        ALTER TABLE RIP.APP_PEDIDOS ALTER COLUMN invoice_n NCHAR(1) COLLATE Modern_Spanish_CI_AS NULL;
        PRINT ' -> Columna "invoice_n" actualizada a la definición correcta.';
    END

    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[RIP].[FK_APP_PEDIDOS_FACTURASVENTA]'))
    BEGIN
        ALTER TABLE RIP.APP_PEDIDOS DROP CONSTRAINT FK_APP_PEDIDOS_FACTURASVENTA;
        PRINT ' -> Restricción FK_APP_PEDIDOS_FACTURASVENTA eliminada para ser recreada.';
    END
    
    ALTER TABLE RIP.APP_PEDIDOS ADD CONSTRAINT FK_APP_PEDIDOS_FACTURASVENTA
    FOREIGN KEY (invoice_series, invoice_number, invoice_n)
    REFERENCES dbo.FACTURASVENTA(NUMSERIE, NUMFACTURA, N);
    PRINT ' -> Restricción FK_APP_PEDIDOS_FACTURASVENTA creada/actualizada.';
    
    PRINT 'Tabla RIP.APP_PEDIDOS actualizada.';
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
    p.invoice_series,
    p.invoice_number,
    p.invoice_n
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
    (SELECT * FROM RIP.VW_APP_PEDIDOS p WHERE p.id = d.order_id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) AS orderDetails,
    (SELECT t.id, t.placa, t.brand, t.model, t.capacity FROM RIP.APP_CAMIONES t WHERE t.id = d.truck_id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) AS truck,
    (SELECT dr.id, dr.name, dr.docId FROM RIP.APP_CHOFERES dr WHERE dr.id = d.driver_id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) AS driver
FROM
    RIP.APP_DESPACHOS d;
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
    dbo.CLIENTES c ON p.customer_id = c.CODCLIENTE;
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
    C.NOMBRECLIENTE AS customer_name,
    FV.FECHA AS invoice_date,
    ROUND(RIP.F_GET_COTIZACION_RIP(FV.TOTALNETO, FV.FECHA, FV.FACTORMONEDA, FV.CODMONEDA, 2), 2) AS total_usd
FROM
    dbo.FACTURASVENTA FV
INNER JOIN
    dbo.CLIENTES C ON FV.CODCLIENTE = C.CODCLIENTE
LEFT JOIN
    RIP.APP_PEDIDOS P ON FV.NUMSERIE = P.invoice_series
                    AND FV.NUMFACTURA = P.invoice_number
                    AND FV.N = P.invoice_n
WHERE
    P.id IS NULL;
GO

PRINT 'Todas las vistas han sido creadas/actualizadas.';
GO

PRINT '====================================================================================';
PRINT '¡Despliegue completado! El esquema, tablas, funciones y vistas han sido creados/actualizados.';
PRINT '====================================================================================';
GO