import { config } from './config.js';
import { openDb } from './db.js';
import { createApp } from './app.js';

const db = openDb(config.DB_PATH);
const app = createApp(db);

app.listen(config.PORT, () => {
  console.log(`Servidor ouvindo na porta ${config.PORT} (${config.NODE_ENV})`);
});
