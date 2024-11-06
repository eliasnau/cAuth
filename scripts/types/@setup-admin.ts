import { Role, User, UserRole } from "@prisma/client";
import { Schema } from "prompt";

// Input schemas
export interface AdminInputSchema extends Schema {
  properties: {
    email: {
      description: string;
      required: boolean;
      format: "email";
    };
    name: {
      description: string;
      required: boolean;
      pattern: RegExp;
      message?: string;
    };
    password: {
      description: string;
      hidden: boolean;
      replace: string;
      required: boolean;
      conform: (value: string) => boolean;
      message: string;
    };
  };
}

export interface MethodSchema extends Schema {
  properties: {
    choice: {
      description: string;
      required: boolean;
      pattern: RegExp;
      message: string;
    };
  };
}

export interface ConfirmSchema extends Schema {
  properties: {
    confirm: {
      description: string;
      required: boolean;
      pattern: RegExp;
      message?: string;
    };
  };
}

export interface UserEmailSchema extends Schema {
  properties: {
    email: {
      description: string;
      required: boolean;
      format: "email";
    };
  };
}

// Service responses
export interface AdminSetupResponse {
  success: boolean;
  user?: User & {
    roles: (UserRole & {
      role: Role;
    })[];
  };
  error?: string;
}

// Function types
export type GetSecureInput = (schema: Schema) => Promise<{
  [key: string]: string;
}>;

export type SetupAdmin = () => Promise<void>;

// Utility types
export interface AdminCreationData {
  email: string;
  name: string;
  password: string;
}

export interface ExistingUserData {
  email: string;
}
