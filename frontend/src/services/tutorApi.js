import { publicApi } from "./api";
export const getAllTutors = async (params={}) => (await publicApi.get("/tutors",{params})).data.tutors;
export const getTutorById = async (id) => (await publicApi.get(`/tutors/${id}`)).data.tutor;
export const getCourses = async () => (await publicApi.get("/tutors/meta/courses")).data.courses;
export const getCountries = async () => (await publicApi.get("/tutors/meta/countries")).data.countries;
