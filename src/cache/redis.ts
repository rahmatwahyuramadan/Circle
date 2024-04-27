import { createClient } from "redis";
import * as dotenv from "dotenv"
dotenv.config()

const redisClient = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : undefined
    }
})

// unutk kondek atau belom
redisClient.on("error", (error) => {
    console.log("Redis Client Error:", error);
    process.exit(1)
})

export default redisClient

export async function redisConnect() {
    try {
        console.log("Connected to Redis, Ready to use");
    } catch (error) {
        console.log("Redis Client Error:", error);
        process.exit(1)
    }
}

export const DEFAULT_EXPIRATION = 3600