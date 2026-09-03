import { createContext } from "react";
import type { CurrentUser } from "../api/auth";

export type AuthContextValue = {
  accessToken: string | null;
  currentUser: CurrentUser;
  loginError: string | null;
  restaurando: boolean;
  login: (token: string, usuario: CurrentUser) => void;
  logout: () => void;
  clearLoginError: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
