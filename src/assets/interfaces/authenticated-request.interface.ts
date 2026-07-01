import { Request } from 'express';

export interface JwtPayload {
  id?: string;
  userId: string;
  email?: string;
}

/**
 * An explicit class wrapper around the Express Request object.
 * This completely satisfies 'isolatedModules' and 'emitDecoratorMetadata'.
 */
export class AuthenticatedRequest {
  // Tell TypeScript this class instances will carry all Express properties
  [key: string]: any;
  
  // Explicitly type your user payload
  user!: JwtPayload;
}