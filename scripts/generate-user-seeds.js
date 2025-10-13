// Archivo: scripts/generate-user-seeds.js
const bcrypt = require('bcryptjs');

const usersToSeed = [
  { email: "cajero@cantera.com", name: "María González", role: "CASHIER" },
  { email: "patio@cantera.com", name: "Juan Pérez", role: "YARD" },
  { email: "seguridad@cantera.com", name: "Carlos López", role: "SECURITY" },
  { email: "admin@cantera.com", name: "Ana Martínez", role: "ADMIN" },
  { email: "reportes@cantera.com", name: "Luis Rodríguez", role: "REPORTS" },
    { email: "Papi@cantera.com", name: "Medula Osea", role: "ADMIN" },
];

const plainTextPassword = '123456';
const saltRounds = 10; // Estándar de la industria

console.log('-- SQL INSERT Statements for APP_USUARIOS --');
console.log('-- Password for all users is "123456" --\n');

usersToSeed.forEach(user => {
  // Generamos el hash para la contraseña
  const salt = bcrypt.genSaltSync(saltRounds);
  const passwordHash = bcrypt.hashSync(plainTextPassword, salt);

  // Creamos el statement SQL
  const insertStatement = `
INSERT INTO RIP.APP_USUARIOS (email, name, role, password_hash) VALUES ('${user.email}', '${user.name}', '${user.role}', '${passwordHash}');
`;

  console.log(insertStatement);
});