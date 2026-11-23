import mongoose from "mongoose";
import { configureDNS, connectionURI, connectionError } from './connection.js';
const connectDB = async () => {
    const connectionString = connectionURI();
    configureDNS();
    try {
        await mongoose.connect(connectionString, {
            dbName: "student_report_system",
            serverSelectionTimeoutMS: 10000
        });

        console.log("MongoDB Atlas connected successfully!");
        console.log('Database: student_report_system');

    } catch (error) {
        throw new Error(connectionError(error));
    }
};

export default connectDB;
