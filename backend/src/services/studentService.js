const studentDatabase = require("../database/studentDatabase");
const authService = require("./authService");
const requireStudent = claims => authService.requireProfile("student", claims);
const registerStudent = async (claims, values, token) => (await authService.registerProfile("student", claims, values, token)).profile;
const updateStudent = async (id, values) => authService.safeProfile(await studentDatabase.updateStudent(id, values));
module.exports = { requireStudent, registerStudent, updateStudent };
