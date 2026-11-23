import { isIP } from 'node:net';
import dns from 'node:dns';

export function connectionURI(env = process.env) {
  let uri = env.MONGODB_URI;
  if (!uri || !/^mongodb(\+srv)?:\/\//.test(uri)) throw new Error('Configure a valid MONGODB_URI.');
  const authority = uri.replace(/^mongodb(\+srv)?:\/\//, '').split(/[/?]/)[0];
  if (!authority.includes('@')) {
    if (!env.MONGODB_USERNAME || !env.MONGODB_PASSWORD) throw new Error('Configure MONGODB_USERNAME and MONGODB_PASSWORD or include credentials in MONGODB_URI.');
    const credentials = `${encodeURIComponent(env.MONGODB_USERNAME)}:${encodeURIComponent(env.MONGODB_PASSWORD)}@`;
    uri = uri.replace(/^(mongodb(?:\+srv)?:\/\/)/, `$1${credentials}`);
  }
  return uri;
}
export function configureDNS(env = process.env) {
  const servers = env.DNS_SERVERS === undefined ? (env.NODE_ENV === 'production' ? '' : '8.8.8.8') : env.DNS_SERVERS;
  if (servers.trim()) {
    const values = servers.split(',').map(s => s.trim());
    if (values.some(value => !isIP(value))) throw new Error('DNS_SERVERS must contain comma-separated IP addresses.');
    dns.setServers(values);
  }
}
export function connectionError(error) {
  const code = error.code || error.cause?.code;
  const message = String(error.message || '');
  if (/querySrv|queryTxt|ENOTFOUND|EAI_AGAIN/i.test(message) || ['ENOTFOUND', 'EAI_AGAIN'].includes(code)) return 'MongoDB DNS lookup failed. Check DNS_SERVERS and SRV resolution; credentials were not changed.';
  if (code === 18 || /Authentication failed|bad auth/i.test(message)) return 'MongoDB authentication failed. Verify the privately configured database account.';
  if (/ServerSelection|Network|Timeout/.test(error.name || '') || ['ECONNREFUSED', 'ETIMEDOUT'].includes(code)) return 'MongoDB network connection failed. Check Atlas network access, firewall, and cluster availability.';
  return 'MongoDB connection failed. Check the private configuration and cluster status.';
}
