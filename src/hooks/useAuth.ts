import { useContext } from "react";
import {
  AuthProvider,
  useAuth as useAuthContext,
} from "../contexts/AuthContext";

export const useAuth = useAuthContext;
