export type User = {
  id: string;
  name: string;
  email: string;
};

export type AuthPayload = {
  user: User;
  accessToken: string;
};

export type ShortUrl = {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  customAlias?: string;
  clickCount: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastAccessedAt?: string;
};

export type UrlListResponse = {
  items: ShortUrl[];
  page: number;
  limit: number;
  total: number;
};

export type AliasResult = {
  id: string;
  customAlias: string;
  shortUrl: string;
  originalUrl: string;
};
