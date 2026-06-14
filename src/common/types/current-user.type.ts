import type { Request } from "express";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
};

export type AuthenticatedRequest = Request & {
  user?: CurrentUser;
};
