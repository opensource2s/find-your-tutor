require("reflect-metadata");
const { DataSource } = require("typeorm");

const entities = [
  "Student", "Tutor", "Review", "Course", "TutorCourse", "Availability",
  "ConnectionRequest", "TutorConnection", "Booking", "Favorite",
  "Conversation", "Message", "Notification",
  "TutorPost", "PostLike", "PostComment", "PostSave", "TutorFollower",
].map((name) => require(`../entities/${name}`));

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: process.env.DB_LOGGING === "true",
  entities,
});

const connectDB = async () => {
  try {
    await AppDataSource.initialize();
    console.log(`✅ Connected to PostgreSQL database successfully: ${process.env.DB_NAME}`);
  } catch (error) {
    console.error("❌ PostgreSQL connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = { AppDataSource, connectDB };
