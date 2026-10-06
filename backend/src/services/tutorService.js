const tutorDatabase = require("../database/tutorDatabase");
const getTutorById = (id) => tutorDatabase.getTutorById(id);
const getAllTutors = (filters) => tutorDatabase.getAllTutors(filters);
const getCourses = () => tutorDatabase.getCourses();
const getCountries = () => tutorDatabase.getCountries();
module.exports = { getTutorById, getAllTutors, getCourses, getCountries };
