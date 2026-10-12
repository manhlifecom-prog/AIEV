import { customerConfig } from "./config.js";
import { customerApp } from "./http.js";

const { app, store, service } = customerApp();
store.recover();
const server = app.listen(customerConfig.port, "127.0.0.1", () => {
  console.log(`AIEV customer API: http://127.0.0.1:${customerConfig.port}`);
  void service.processQueue();
});
server.requestTimeout = 120_000;
server.headersTimeout = 15_000;
function stop() { server.close(() => { store.db.close(); process.exit(0); }); }
process.on("SIGTERM", stop); process.on("SIGINT", stop);
