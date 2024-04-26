import cors from "cors"
import express from "express"
import * as dotenv from "dotenv"
import router from "./routes/router"
import { redisConnect } from "./cache/redis"

const app = express()
app.use(express.json())

dotenv.config()

const corsOption = {
    "origin": "*",
    "methods": "GET, POST, PUT, PATCH, DELETE, HEAD",
    "preflightContinue": false,
    "optionsSuccessStaus": 204
}

app.use(cors(corsOption))

app.use("/api/circle", router)

app.listen(process.env.PORT, () => {
    redisConnect()
    console.log(`Server running in PORT : ${process.env.PORT}`);
})