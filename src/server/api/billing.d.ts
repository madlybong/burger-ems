import { Hono } from "hono";
declare const billing: Hono<import("hono/types").BlankEnv, import("hono/types").BlankSchema, "/">;
export default billing;
