import db from '../src/server/db/index';
db.run("UPDATE employees SET is_first_login = 1 WHERE username = 'EMP1'");
console.log('Reset EMP1');
