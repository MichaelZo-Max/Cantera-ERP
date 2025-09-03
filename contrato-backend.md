
---

## **Contrato de Datos: Backend (SQL Server) ↔ Frontend**

### **La Regla de Oro**

- **VISTAS (`RIP.VW_...`) son para LEER 👓:** Se usan para buscar y obtener datos maestros (clientes, productos). Son de **solo lectura (`SELECT`)**.
    
- **TABLAS (`RIP.APP_...`) son para TRABAJAR ✍️:** Se usan para crear, modificar y gestionar los registros del nuevo flujo (pedidos, despachos, etc.). Soportan operaciones de escritura (`INSERT`, `UPDATE`).
    

---

### ## 1. Vistas (Solo Lectura)

#### **`RIP.VW_APP_CLIENTES`**

- **Propósito:** Para buscar y obtener la información de los clientes existentes en el sistema principal.
    
- **Columnas:**
    
    - `id` (INT): Identificador único del cliente.
        
    - `name` (NVARCHAR): Nombre o razón social del cliente.
        
    - `rfc` (NVARCHAR): Identificación fiscal.
        
    - `address` (NVARCHAR): Dirección principal.
        
    - `phone` (NVARCHAR): Teléfono de contacto.
        
    - `email` (NVARCHAR): Correo electrónico.
        
    - `is_active` (BIT): `1` si está activo, `0` si no.
        
- **Ejemplos de Uso:**
    
    - **Buscar un cliente por nombre:**
        
        SQL
        
        ```
        SELECT id, name, rfc FROM RIP.VW_APP_CLIENTES WHERE name LIKE '%[texto_busqueda]%';
        ```
        
    - **Obtener los datos completos de un cliente seleccionado:**
        
        SQL
        
        ```
        SELECT * FROM RIP.VW_APP_CLIENTES WHERE id = [id_cliente];
        ```
        

<br>

#### **`RIP.VW_APP_PRODUCTOS`**

- **Propósito:** Para buscar productos, obtener su código, unidad de medida y el precio de venta más reciente.
    
- **Columnas:**
    
    - `id` (INT): Identificador único del producto.
        
    - `codigo` (NVARCHAR): Código o referencia del producto.
        
    - `name` (NVARCHAR): Nombre del producto.
        
    - `price_per_unit` (DECIMAL): Último precio de venta registrado.
        
    - `unit` (NVARCHAR): Unidad de medida base (ej. 'm3', 'Ton').
        
    - `is_active` (BIT): `1` si está activo, `0` si no.
        
- **Ejemplos de Uso:**
    
    - **Listar todos los productos activos:**
        
        SQL
        
        ```
        SELECT id, name, price_per_unit, unit FROM RIP.VW_APP_PRODUCTOS WHERE is_active = 1;
        ```
        
    - **Buscar un producto por nombre o código:**
        
        SQL
        
        ```
        SELECT id, name, price_per_unit FROM RIP.VW_APP_PRODUCTOS WHERE name LIKE '%[texto_busqueda]%' OR codigo LIKE '%[texto_busqueda]%';
        ```
        

---

### ## 2. Tablas (Lectura y Escritura)

#### **`RIP.APP_USUARIOS`**

- **Propósito:** Gestiona los usuarios que acceden al aplicativo.
    
- **Columnas:** `id` (autonumérico), `email`, `name`, `role`, `password_hash`, `is_active`, etc.
    
- **Operaciones Comunes:**
    
    - **Login (Lectura):** `SELECT id, name, role, password_hash FROM RIP.APP_USUARIOS WHERE email = '[email_usuario]' AND is_active = 1;`
        
    - **Creación (Escritura):** `INSERT INTO RIP.APP_USUARIOS (email, name, role, password_hash) VALUES (...);`
        

<br>

#### **`RIP.APP_CAMIONES`**

- **Propósito:** Maestro de camiones disponibles.
    
- **Columnas:** `id` (autonumérico), `placa`, `brand`, `model`, `capacity`, `driver_name`, `is_active`, etc.
    
- **Operaciones Comunes:**
    
    - **Poblar un selector (Lectura):** `SELECT id, placa, driver_name, capacity FROM RIP.APP_CAMIONES WHERE is_active = 1;`
        
    - **Creación (Escritura):** `INSERT INTO RIP.APP_CAMIONES (placa, brand, capacity, driver_name) VALUES (...);`
        

<br>

#### **`RIP.APP_PEDIDOS` (Encabezado)**

- **Propósito:** Almacena la información general de cada orden.
    
- **Columnas:** `id` (autonumérico), `order_number` (autogenerado), `customer_id`, `truck_id`, `status`, `notes`, `created_by`, etc.
    
- **Operaciones Comunes:**
    
    - **Creación (Escritura):** Se crea al inicio del flujo.
        
    - **Actualización de Estado (Escritura):** `UPDATE RIP.APP_PEDIDOS SET status = '[nuevo_estado]' WHERE id = [id_pedido];`
        

<br>

#### **`RIP.APP_PEDIDOS_ITEMS` (Líneas)**

- **Propósito:** Almacena los productos específicos de un pedido.
    
- **Columnas:** `id` (autonumérico), `order_id` (vincula con `APP_PEDIDOS`), `product_id`, `quantity`, `price_per_unit`.
    
- **Operaciones Comunes:**
    
    - **Añadir un producto (Escritura):** `INSERT INTO RIP.APP_PEDIDOS_ITEMS (order_id, product_id, quantity, price_per_unit) VALUES (...);`
        

<br>

#### **`RIP.APP_DESPACHOS`**

- **Propósito:** Registra los eventos físicos: carga en patio y salida por vigilancia.
    
- **Columnas:** `id` (autonumérico), `order_id`, `loaded_quantity`, `loaded_by`, `loaded_at`, `load_photo_url`, `exited_by`, `exited_at`, `exit_photo_url`, `status`.
    
- **Operaciones Comunes:**
    
    - **Registrar Carga (Escritura):** `INSERT INTO RIP.APP_DESPACHOS (order_id, loaded_by, loaded_at, load_photo_url, status) VALUES (...);`
        
    - **Registrar Salida (Escritura):** `UPDATE RIP.APP_DESPACHOS SET exited_by = ..., exited_at = ..., exit_photo_url = ..., status = 'EXITED' WHERE order_id = [id_pedido];`
        

---

### ## Flujo de Ejemplo: Crear un Pedido con 2 Productos

1. **Crear el Encabezado:** El aplicativo primero crea el registro maestro del pedido.
    
    SQL
    
    ```
    -- El aplicativo ejecuta esto y debe recuperar el ID generado (SCOPE_IDENTITY()).
    INSERT INTO RIP.APP_PEDIDOS (customer_id, truck_id, created_by, notes)
    VALUES (1121, 8, 3, 'Entrega urgente');
    
    -- Supongamos que el ID generado fue 151.
    DECLARE @NuevoPedidoID INT = 151;
    ```
    
2. **Añadir el Primer Producto:**
    
    SQL
    
    ```
    INSERT INTO RIP.APP_PEDIDOS_ITEMS (order_id, product_id, quantity, price_per_unit)
    VALUES (@NuevoPedidoID, 201, 10, 25.50); -- ID 201 = Arena, Precio 25.50
    ```
    
3. **Añadir el Segundo Producto:**
    
    SQL
    
    ```
    INSERT INTO RIP.APP_PEDIDOS_ITEMS (order_id, product_id, quantity, price_per_unit)
    VALUES (@NuevoPedidoID, 305, 5.5, 32.00); -- ID 305 = Grava, Precio 32.00
    ```
    

El pedido **#151** ahora existe en el sistema con dos productos asociados.