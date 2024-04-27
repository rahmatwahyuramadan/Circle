import { PrismaClient } from "@prisma/client"
import { Request, Response } from "express"
import cloudinary from "../config"
import * as fs from "fs"
import { addthread } from "../utils/ThreadUtils"
import amqp from "amqplib"

const prisma = new PrismaClient()
function isValidUUID(uuid: string): boolean {
    const UUIDRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
    // const UUIDRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{3}-[a-f0-9]{12}$/i
    return UUIDRegex.test(uuid)
}

export default new class ThreadsQueue {
    private readonly UserRepository = prisma.user
    private readonly ThreadRepository = prisma.thread

    async addThreadQueue(req: Request, res: Response): Promise<Response> {
        try {
            const body = req.body;
            const { error } = addthread.validate(body)
            if (error) return res.status(400).json({ message: error.message })

            const userId = res.locals.loginSession.User.id

            const userSelect = await this.UserRepository.findUnique({
                where: { id: userId }
            })
            if (!userSelect) return res.status(404).json({ message: "User not found" })


            const image = req.files
            const imageURL: string[] = []

            if (image) {
                if (Array.isArray(image)) {
                    await Promise.all(image.map(async (data) => {
                        const cloudinaryUpload = await cloudinary.uploader.upload(data.path, {
                            folder: "thread_pictures"
                        })
                        imageURL.push(cloudinaryUpload.secure_url)
                        fs.unlinkSync(data.path)
                    }))
                }
            } else {
                imageURL.push("")
            }

            const payload = {
                content: body.content,
                image: imageURL,
                user: res.locals.loginSession.User.id
            }

            const connection = await amqp.connect("amqp://localhost")
            const channel = await connection.createChannel()

            await channel.assertQueue("thread_circle53_queue")
            channel.sendToQueue("thread_circle53_queue", Buffer.from(JSON.stringify(payload)))

            let rabbitData

            const messageProssesed = new Promise<void>((resolve, reject) => {
                channel.consume("thread_circle53_queue", async (message) => {
                    if (message) {
                        try {
                            const payload = JSON.parse(message.content.toString())
                            const rabbit = await this.ThreadRepository.create({
                                data: {
                                    content: payload.content,
                                    image: imageURL,
                                    created_at: new Date(),
                                    user: { connect: { id: userId } }
                                }
                            })
                            console.log("Dapat pesan", message.content.toString());

                            rabbitData = rabbit
                            channel.ack(message)
                            resolve()
                        } catch (error) {
                            console.log("Error proses pesannya:", error);
                            reject(error)
                        }
                    }
                })
            })

            await messageProssesed
            await channel.close()
            await connection.close()

            return res.status(201).json({
                code: 201,
                status: "Success",
                message: "Add Threads from rabbit MQ Success",
                data: rabbitData
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: error })
        }
    }
}