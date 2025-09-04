// lib/db.ts
import { Connection, Request, TYPES } from "tedious";

export type DBParam = {
  name: string;
  type: any; // antes: TediousType
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
  },
};

export async function executeQuery<T = any>(query: string, params: DBParam[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const connection = new Connection(config);

    connection.on('connect', (err) => {
      if (err) {
        console.error('Error de conexión:', err);
        return reject(err);
      }

      const results: any[] = [];
      const request = new Request(query, (err) => {
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

      connection.execSql(request);
    });

    connection.connect();
  });
}

export { TYPES };