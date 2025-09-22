import { Connection, Request, TYPES, ConnectionError } from "tedious";

// Definición de tipos para mayor claridad
export type DBParam = {
  name: string;
  type: any;
  value: any;
  options?: { precision?: number; scale?: number; length?: number };
};

const config = {
  server: process.env.DB_SERVER || 'localhost',
  authentication: {
    type: 'default' as const,
    options: {
      userName: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || '1234',
    },
  },
  options: {
    database: process.env.DB_DATABASE || 'CANTERA',
    trustServerCertificate: true,
    encrypt: false,
    requestTimeout: 30000, // Aumentado el timeout a 30 segundos
    // El pool se configura aquí y Tedious lo gestiona automáticamente
    pool: {
      min: 0,
      max: 15, // Aumentado para soportar más concurrencia
      idleTimeoutMillis: 30000
    }
  },
};

// --- Función executeQuery que aprovecha el pool interno de Tedious ---

export async function executeQuery<T = any>(query: string, params: DBParam[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    // 1. Se crea una nueva instancia de Connection en cada llamada.
    // Tedious la tomará de su pool interno si hay una disponible.
    const connection = new Connection(config);

    connection.on('connect', (err) => {
      if (err) {
        console.error('Error de conexión:', err);
        return reject(err);
      }

      const results: any[] = [];
      const request = new Request(query, (err) => {
        // 2. Cerramos la conexión después de cada consulta.
        // Tedious la devolverá al pool para ser reutilizada.
        connection.close(); 
        
        if (err) {
          console.error('Error en la consulta:', err);
          return reject(err);
        }
        resolve(results);
      });

      request.on('row', (columns: any[]) => {
        const row: Record<string, any> = {};
        columns.forEach((c: any) => {
          row[String(c.metadata.colName)] = c.value;
        });
        results.push(row);
      });
      
      for (const p of params) {
          if (p.type === TYPES.Decimal || p.type === TYPES.Numeric) {
            request.addParameter(
              p.name, p.type, p.value,
              { precision: p.options?.precision ?? 18, scale: p.options?.scale ?? 2 }
            );
          } else if (p.type === TYPES.NVarChar || p.type === TYPES.VarChar) {
            const len = p.options?.length ?? (
              typeof p.value === 'string'
                ? Math.min(4000, Math.max(1, p.value.length))
                : 255
            );
            request.addParameter(
              p.name, p.type, p.value,
              { length: len }
            );
          } else {
            request.addParameter(p.name, p.type, p.value);
          }
      }

      try {
        connection.execSql(request);
      } catch(e) {
        connection.close();
        reject(e);
      }
    });

    connection.connect();
  });
}

export { TYPES };