export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const requireFound = (value, message = 'Record not found.') => {
  if (!value) throw new HttpError(404, message);
  return value;
};
export const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
