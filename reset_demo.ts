import db from './src/server/db/index';

const passwordHash = await Bun.password.hash('welcome123');
db.run("UPDATE employees SET password_hash = ?, is_first_login = 1 WHERE username = 'EMP1'", [passwordHash]);

console.log("Reset EMP1");
