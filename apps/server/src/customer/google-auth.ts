import { createHash, randomBytes } from 'node:crypto';
import type { Express, Request, Response, RequestHandler } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { customerConfig } from './config.js';
import { CustomerError, CustomerStore, type User } from './store.js';

const digest = (s: string) => createHash('sha256').update(s).digest('hex');
const random = () => randomBytes(32).toString('base64url');
const cookieName = 'aiev_google';
const readCookie = (req: Request) => req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith(cookieName + '='))?.slice(cookieName.length + 1) || '';
type Identity = { sub: string; email: string; name: string };
export function googleSchema(store: CustomerStore) {
  store.db.exec(`CREATE TABLE IF NOT EXISTS google_accounts(sub TEXT PRIMARY KEY,user_id TEXT UNIQUE NOT NULL REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS google_flows(hash TEXT PRIMARY KEY,state TEXT NOT NULL,nonce TEXT NOT NULL,verifier TEXT NOT NULL,expires INTEGER NOT NULL,identity TEXT);`);
}
export function googleAccount(store: CustomerStore, identity: Identity, password?: string) {
  return store.transaction(() => {
    const linked = store.db.prepare('SELECT user_id FROM google_accounts WHERE sub=?').get(identity.sub);
    let user = linked ? store.user(String(linked.user_id)) : store.db.prepare('SELECT * FROM users WHERE email=?').get(identity.email.toLowerCase()) as User | undefined;
    if (user?.blocked) throw new CustomerError(403, 'Tài khoản đã bị khóa. Hãy liên hệ quản trị.');
    if (linked) return user!;
    if (user) {
      if (!password) return null;
      user = store.login(user.email, password);
      if (store.db.prepare('SELECT sub FROM google_accounts WHERE user_id=?').get(user.id)) throw new CustomerError(409, 'Tài khoản đã liên kết Google khác.');
    } else user = store.register(identity.email, identity.name || identity.email.split('@')[0], random());
    store.db.prepare('INSERT INTO google_accounts VALUES(?,?)').run(identity.sub, user.id);
    return user;
  });
}
export function googleRoutes(app: Express, store: CustomerStore, limit: RequestHandler, sessionCookie: (res: Response, token: string) => void) {
  googleSchema(store);
  const options = { httpOnly: true, secure: customerConfig.origin.startsWith('https://'), sameSite: 'lax' as const, path: '/api/customer/auth/google', maxAge: 600_000 };
  const ready = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const redirect = customerConfig.origin + '/api/customer/auth/google/callback';
  const client = () => new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirect);
  app.get('/api/customer/auth/google/status', (req, res) => {
    const row = store.db.prepare('SELECT identity FROM google_flows WHERE hash=? AND expires>?').get(digest(readCookie(req)), Date.now());
    res.json({ enabled: ready(), linkRequired: Boolean(row?.identity) });
  });
  app.get('/api/customer/auth/google', limit, (_req, res) => {
    if (!ready()) return res.redirect('/studio?google=unavailable');
    const token = random(), state = random(), nonce = random(), verifier = random();
    store.db.prepare('DELETE FROM google_flows WHERE expires<?').run(Date.now());
    store.db.prepare('INSERT INTO google_flows VALUES(?,?,?,?,?,NULL)').run(digest(token), state, nonce, verifier, Date.now() + 600_000);
    res.cookie(cookieName, token, options);
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: redirect, response_type: 'code', scope: 'openid email profile', state, nonce, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', prompt: 'select_account' }).toString();
    res.redirect(url.toString());
  });
  app.get('/api/customer/auth/google/callback', limit, async (req, res) => {
    const hash = digest(readCookie(req));
    const flow = store.db.prepare('DELETE FROM google_flows WHERE hash=? RETURNING *').get(hash);
    res.clearCookie(cookieName, options);
    if (!flow || Number(flow.expires) <= Date.now() || typeof req.query.state !== 'string' || flow.state !== req.query.state || flow.identity) return res.redirect('/studio?google=expired');
    if (req.query.error) return res.redirect('/studio?google=cancelled');
    try {
      if (!ready() || typeof req.query.code !== 'string' || req.query.code.length > 4096) throw new Error('Invalid code');
      const oauth = client();
      const { tokens } = await oauth.getToken({ code: req.query.code, codeVerifier: String(flow.verifier), redirect_uri: redirect });
      if (!tokens.id_token) throw new Error('Missing identity');
      const payload = (await oauth.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID })).getPayload();
      if (!payload?.sub || !payload.email || !payload.email_verified || (payload as unknown as { nonce: string }).nonce !== flow.nonce) throw new Error('Invalid identity');
      const identity = { sub: payload.sub, email: payload.email.toLowerCase(), name: (payload.name || '').slice(0, 100) };
      const user = googleAccount(store, identity);
      if (!user) {
        const token = random();
        store.db.prepare('INSERT INTO google_flows VALUES(?,?,?,?,?,?)').run(digest(token), '', '', '', Date.now() + 600_000, JSON.stringify(identity));
        res.cookie(cookieName, token, options);
        return res.redirect('/studio?google=link');
      }
      sessionCookie(res, store.createSession(user.id));
      res.redirect(user.role === 'admin' ? '/studio/admin' : '/studio');
    } catch { res.redirect('/studio?google=failed'); }
  });
  app.post('/api/customer/auth/google/link', limit, (req, res) => {
    if (req.headers.origin !== customerConfig.origin) throw new CustomerError(403, 'Nguồn yêu cầu không hợp lệ');
    const hash = digest(readCookie(req));
    const flow = store.db.prepare('SELECT identity FROM google_flows WHERE hash=? AND expires>?').get(hash, Date.now());
    if (!flow?.identity) throw new CustomerError(401, 'Hãy đăng nhập Google lại.');
    if (typeof req.body?.password !== 'string' || !req.body.password || req.body.password.length > 128) throw new CustomerError(400, 'Hãy nhập mật khẩu hiện tại.');
    const user = googleAccount(store, JSON.parse(String(flow.identity)), req.body.password)!;
    store.db.prepare('DELETE FROM google_flows WHERE hash=?').run(hash);
    res.clearCookie(cookieName, options);
    sessionCookie(res, store.createSession(user.id));
    res.json(store.publicUser(user));
  });
}
