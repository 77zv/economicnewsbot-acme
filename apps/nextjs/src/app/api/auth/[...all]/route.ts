import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@repo/api";
 
export const { POST, GET } = toNextJsHandler(auth);