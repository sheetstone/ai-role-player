import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express'

export interface AppError extends Error {
  status?: number
}

export const errorHandler: ErrorRequestHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = err.status ?? 500
  const message = err.message || 'Internal server error'
  res.status(status).json({ error: message })
}
