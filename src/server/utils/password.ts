
export function generateStrongPassword(length = 10): string {
    // Readable characters (no l, I, 1, 0, O)
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const digits = "23456789";
    const symbols = "!@#$*";

    const all = lower + upper + digits + symbols;

    // Ensure at least one of each required type
    let password = [
        lower[Math.floor(Math.random() * lower.length)],
        upper[Math.floor(Math.random() * upper.length)],
        digits[Math.floor(Math.random() * digits.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
    ];

    // Fill remaining
    for (let i = 4; i < length; i++) {
        password.push(all[Math.floor(Math.random() * all.length)]);
    }

    // Shuffle
    return password.sort(() => Math.random() - 0.5).join('');
}

export function isStrongPassword(password: string): { valid: boolean; error?: string } {
    if (password.length < 8) return { valid: false, error: "Password must be at least 8 characters long." };
    if (!/[a-z]/.test(password)) return { valid: false, error: "Password must contain at least one lowercase letter." };
    if (!/[A-Z]/.test(password)) return { valid: false, error: "Password must contain at least one uppercase letter." };
    if (!/\d/.test(password)) return { valid: false, error: "Password must contain at least one digit." };
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) return { valid: false, error: "Password must contain at least one symbol." };

    return { valid: true };
}
