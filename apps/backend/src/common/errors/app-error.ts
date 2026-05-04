import type { ContentfulStatusCode } from "hono/utils/http-status";
import { HTTPException } from "hono/http-exception";

export interface AppErrorOptions {
  code: string;
  statusCode: ContentfulStatusCode;
}

export class AppError extends HTTPException {
  readonly code: string;

  constructor(message: string, opts: AppErrorOptions) {
    super(opts.statusCode, { message });
    this.code = opts.code;
  }
}
