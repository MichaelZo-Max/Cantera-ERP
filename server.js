const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const https = require('https');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const ip = '10.10.10.131'; 
const keyPath = './localhost+3-key.pem';
const certPath = './localhost+3.pem';

// Validar que los archivos de certificado existan antes de continuar
if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error('❌ Error: No se encontraron los archivos de certificado.');
  console.error('Asegúrate de ejecutar mkcert y que los archivos estén en la raíz del proyecto.');
  process.exit(1);
}

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

app.prepare().then(() => {
  https.createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;

    // --- LÓGICA MEJORADA PARA SERVIR EL SERVICE WORKER ---
    // Si el navegador pide el service worker o el archivo de workbox, lo servimos manualmente.
    if (pathname === '/sw.js' || pathname.startsWith('/workbox-')) {
      const filePath = path.join(__dirname, 'public', pathname);
      res.setHeader('Content-Type', 'application/javascript');
      fs.createReadStream(filePath).pipe(res);
    } else {
      // Para todo lo demás, dejamos que Next.js se encargue.
      handle(req, res, parsedUrl);
    }
  }).listen(3000, '0.0.0.0', (err) => {
    if (err) throw err;
    console.log(`> Servidor HTTPS de producción listo en: https://${ip}:3000`);
  });
});