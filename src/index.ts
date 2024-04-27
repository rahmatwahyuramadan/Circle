import Express from "express"
import * as dotenv from "dotenv"
import cors from "cors"
import router from "./routes/router"
import { redisConnect } from "./cache/redis";

const app = Express()

app.use(Express.json())

dotenv.config()

const corsOption = {
    "origin" : "*",
    "methods" : "GET, POST, PUT, PATCH, DELETE, HEAD",
    "preflightContinue" : false,
    "optionSuccessStatus" : 204
}

app.use(cors(corsOption))

app.use("/api/circle", router)

app.listen(process.env.PORT, () => {
    redisConnect();
    console.log(`Successfully running on port : ${process.env.PORT}`)
})