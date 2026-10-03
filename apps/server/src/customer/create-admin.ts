import { randomBytes } from "node:crypto";
import { CustomerStore } from "./store.js";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw new Error("Dùng: node node_modules/tsx/dist/cli.mjs apps/server/src/customer/create-admin.ts <email>");
const store = new CustomerStore();
try {
  if (store.db.prepare("SELECT id FROM users WHERE email=?").get(email)) throw new Error("Email đã tồn tại. Không thay đổi tài khoản hoặc mật khẩu hiện có.");
  const password = "Aiev-" + randomBytes(15).toString("base64url");
  store.transaction(() => {
    const user = store.register(email, "Mạnh - Quản trị", password);
    store.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(user.id);
  });
  console.log(JSON.stringify({ email, password, role: "admin" }));
} finally { store.db.close(); }
