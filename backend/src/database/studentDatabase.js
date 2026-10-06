const { AppDataSource } = require("../config/db");
const Student = require("../entities/Student");

const getStudentByAuth0Id = async (auth0Id) => AppDataSource.getRepository(Student).findOne({ where: { auth0_id: auth0Id, is_active: true } });
const createStudent = async (studentData) => {
  const repo = AppDataSource.getRepository(Student);
  return repo.save(repo.create(studentData));
};
const updateStudent = async (id, values) => {
  const allowed = ["name","mobile","country","timezone","preferred_languages","profile_image","learning_goals","current_level","interests"];
  const clean = Object.fromEntries(Object.entries(values).filter(([k,v]) => allowed.includes(k) && v !== undefined));
  if (!Object.keys(clean).length) return AppDataSource.getRepository(Student).findOneBy({ id });
  await AppDataSource.getRepository(Student).update({ id }, clean);
  return AppDataSource.getRepository(Student).findOneBy({ id });
};
module.exports = { getStudentByAuth0Id, createStudent, updateStudent };
