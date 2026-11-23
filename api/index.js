import connectDB from '../backend/config/db.js';
import { createApp } from '../backend/app.js';

const app = createApp();

let connectionPromise;

export default async function handler(req, res) {
    try {
        if (!connectionPromise) {
            connectionPromise = connectDB().catch(error => {
                connectionPromise = null;
                throw error;
            });
        }

        await connectionPromise;
        return app(req, res);
    } catch (error) {
        console.error('API initialization failed:', error);
        return res.status(503).json({
            success: false,
            message: 'Backend temporarily unavailable.'
        });
    }
}