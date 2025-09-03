// Archivo: lib/db.ts (versión corregida)
import { Connection, Request, TYPES } from "tedious";

// Quitamos la importación de 'ConnectionConfig' y 'ColumnValue' que ya no se exportan así.

const config = { // <-- Eliminamos el tipo explícito :ConnectionConfig
  server: process.env.DB_SERVER || 'localhost',
  authentication: {
    type: 'default' as const, // Añadimos 'as const' para mayor seguridad de tipo
    options: {
      userName: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || '1234',
    },
  },
  options: {
    database: process.env.DB_DATABASE || 'CANTERA',
    encrypt: true,
    trustServerCertificate: true,
  },
};

export async function executeQuery(query: string, params: { name: string, type: any, value: any }[] = []): Promise<any[]> {
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

      // Aquí cambiamos el tipo de 'columns' a 'any[]' para evitar el error.
      // La lógica interna sigue siendo segura.
      request.on('row', (columns: any[]) => {
        const row: { [key: string]: any } = {};
        columns.forEach(column => {
          row[column.metadata.colName] = column.value;
        });
        results.push(row);
      });

      params.forEach(p => request.addParameter(p.name, p.type, p.value));

      connection.execSql(request);
    });

    connection.connect();
  });
}

// Exportamos TYPES para poder usarlo en otros archivos (como el de login)
export { TYPES };