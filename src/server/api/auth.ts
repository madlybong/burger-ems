import { Hono } from "hono";
import { sign } from "hono/jwt";
import db from "../db";

const auth = new Hono();
const SECRET = process.env.JWT_SECRET || "ASTRAKE_EMS_SECRET_KEY_2025";

auth.post("/login", async (c) => {
    const { username, password } = await c.req.json();

    if (!username || !password) {
        return c.json({ error: "Username and password required" }, 400);
    }

    // Check for admin login first (hardcoded for now)
    if (username === 'admin' && password === 'admin123') {
        const payload = {
            id: 0,
            name: 'Administrator',
            role: 'admin',
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
        };

        const token = await sign(payload, SECRET);

        return c.json({
            token,
            user: {
                id: 0,
                name: 'Administrator',
                username: 'admin',
                role: 'admin',
                is_first_login: false
            }
        });
    }

    // Check employee login
    const employee = db.query("SELECT * FROM employees WHERE username = ? COLLATE NOCASE").get(username) as any;

    if (!employee) {
        return c.json({ error: "Invalid credentials" }, 401);
    }

    let isValid = false;
    let isDefault = false;

    if (!employee.password_hash) {
        // Default password logic for initial access
        // Convention: "welcome" + username, or fixed "welcome123"
        // Let's go with fixed "welcome123" for simplicity in this phase
        if (password === "welcome123") {
            isValid = true;
            isDefault = true;
        }
    } else {
        isValid = await Bun.password.verify(password, employee.password_hash);
    }

    if (!isValid) {
        return c.json({ error: "Invalid credentials" }, 401);
    }

    // Generate Token
    const payload = {
        id: employee.id,
        name: employee.name,
        role: "employee",
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    };

    const token = await sign(payload, SECRET);

    return c.json({
        token,
        user: {
            id: employee.id,
            name: employee.name,
            username: employee.username,
            role: "employee",
            is_first_login: !!employee.is_first_login || isDefault
        }
    });
});

auth.post("/change-password", async (c) => {
    // We expect the user to send the Authorization header
    // But since we are inside the 'auth' route, we might not have the middleware applied globally yet.
    // We can manually verify here or expect middleware.
    // For this specific endpoint, we'll implement manual verify similar to middleware for simplicity
    // or rely on a middleware we'll mount.

    // To keep it self-contained:
    const authHeader = c.req.header("Authorization");
    if (!authHeader) return c.json({ error: "Unauthorized" }, 401);

    const { verify } = await import("hono/jwt");
    const token = authHeader.split(" ")[1];
    let payload;
    try {
        payload = await verify(token, SECRET);
    } catch (e) {
        return c.json({ error: "Invalid token" }, 401);
    }

    const { new_password } = await c.req.json();

    // Import validation logic
    const { isStrongPassword } = await import("../utils/password");
    const validation = isStrongPassword(new_password);

    if (!validation.valid) {
        return c.json({ error: validation.error }, 400);
    }

    const hash = await Bun.password.hash(new_password);

    db.run(
        "UPDATE employees SET password_hash = ?, is_first_login = 0 WHERE id = ?",
        hash, (payload as any).id
    );

    return c.json({ success: true, message: "Password updated successfully" });
});

export default auth;
