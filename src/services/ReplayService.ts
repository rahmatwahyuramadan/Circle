import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { addthread } from "../utils/ThreadUtils";
import cloudinary from "../config"
import * as fs from "fs"

const prisma = new PrismaClient()

function isValidUUID(uuid: string): boolean {
    const UUIDRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
    return UUIDRegex.test(uuid)
}

export default new class ReplyService {
    private readonly ReplyRepository = prisma.reply
    private readonly UserRepository = prisma.user
    private readonly ThreadRepository = prisma.thread

    async addReply(req: Request, res: Response) {
        try {
            const threadId = req.params.threadId

            if (!isValidUUID(threadId)) {
                return res.status(400).json({ message: "Invalid UUID" })
            }

            const userId = res.locals.loginSession.User.id

            const userSelected = await this.UserRepository.findUnique({
                where: {
                    id: userId
                }
            })

            if (!userSelected) return res.status(404).json({ message: "User no found" })

            const threadSelected = await this.ThreadRepository.findUnique({
                where: {
                    id: threadId
                }
            })
            if (!threadSelected) return res.status(404).json({ message: "Thread no found" })

            const body = req.body
            const { error } = addthread.validate(body)
            if (error) return res.status(400).json({ message: error.message })

            const image = req.files
            const imageURL: string[] = []

            if(image) {
                if(Array.isArray(image)) {
                    Promise.all(image.map(async (data) => {
                        const cloudinaryUpload = await cloudinary.uploader.upload(data.path, {
                            folder: "Circle53"
                        })
                        imageURL.push(cloudinaryUpload.secure_url)
                        fs.unlinkSync(data.path)
                    })).then (async () => {
                        const newReplies = await this.ReplyRepository.create({
                            data: {
                                content: body.content,
                                image: imageURL,
                                user: {
                                    connect: { id: userId }
                                },
                                thread: {
                                    connect: { id: threadId }
                                }
                            }
                        })
            
                        await this.ThreadRepository.update({
                            where: { id: threadId },
                            data: {
                                replies: { connect: { id: newReplies.id } }
                            }
                        })
            
                        return res.status(201).json({
                            code: 201,
                            status: "Add Replies Success!",
                            data: newReplies
                        })
                    })
                }
            }else {
                imageURL.push("")

                const newReplies = await this.ReplyRepository.create({
                    data: {
                        content: body.content,
                        image: imageURL,
                        user: {
                            connect: { id: userId }
                        },
                        thread: {
                            connect: { id: threadId }
                        }
                    }
                })
    
                await this.ThreadRepository.update({
                    where: { id: threadId },
                    data: {
                        replies: { connect: { id: newReplies.id } }
                    }
                })
    
                return res.status(201).json({
                    code: 201,
                    status: "Add Replies Success!",
                    data: newReplies
                })
            }

        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: error })
        }
    }

    async updateReply(req: Request, res: Response) {
        try {
            const { replyId, threadId } = req.params

            if (!isValidUUID(replyId) && !isValidUUID(threadId)) {
                return res.status(400).json({ message: "Invalid UUID" })
            }

            const userId = res.locals.loginSession.User.id

            const userSelected = await this.UserRepository.findUnique({
                where: {
                    id: userId
                }
            })

            if (!userSelected) return res.status(404).json({ message: "User no found" })

            const threadSelected = await this.ThreadRepository.findUnique({
                where: {
                    id: threadId
                }
            })
            if (!threadSelected) return res.status(404).json({ message: "Thread no found" })

            const replySelected = await this.ReplyRepository.findUnique({
                where: {
                    id: replyId
                }
            })
            if (!replySelected) return res.status(404).json({ message: "Reply no found" })

            const body = req.body
            const { error } = addthread.validate(body)
            if (error) return res.status(400).json({ message: error.message })

            const image = req.files
            let content = replySelected.content
            const imageURL: string[] = replySelected.image

            if(body.content !== undefined && body.content !== "") {
                content = body.content
            }

            if(image) {
                if(Array.isArray(image)) {
                    Promise.all(image.map(async (data) => {
                        const cloudinaryUpload = await cloudinary.uploader.upload(data.path, {
                            folder: "Circle"
                        })
                        imageURL.push(cloudinaryUpload.secure_url)
                        fs.unlinkSync(data.path)
    
                        if(replySelected && replySelected.image) {
                            {replySelected.image.map(async (data) => {
                                const oldImage = data.split("/").pop()?.split(".")[0]
                                await cloudinary.uploader.destroy(oldImage as string)
                            })}
                        }
                    })).then (async () => {
                        const updatedReplies = await this.ReplyRepository.update({
                            where: { id: replyId },
                            data: {
                                content: content,
                                image: imageURL
                            }
                        })
            
                        return res.status(200).json({
                            code: 200,
                            status: "Update Replies Success!",
                            data: updatedReplies
                        })
                    })
                }else {
                    const updatedReplies = await this.ReplyRepository.update({
                        where: { id: replyId },
                        data: {
                            content: content,
                            image: imageURL
                        }
                    })
        
                    return res.status(200).json({
                        code: 200,
                        status: "Update Replies Success!",
                        data: updatedReplies
                    })
                }
            }

        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: error })
        }
    }

    async deleteReply(req: Request, res: Response): Promise<Response> {
        try {
            const replyId = req.params.replyId

            if (!isValidUUID(replyId)) {
                return res.status(400).json({ message: "Invalid UUID" })
            }

            const userId = res.locals.loginSession.User.id

            const userSelect = await this.UserRepository.findUnique({
                where: { id: userId }
            })
            if (!userSelect) return res.status(404).json({ message: "User not found" })

            const oldReplyData = await this.ReplyRepository.findUnique({
                where: { id: replyId },
                select: { image: true }
            })

            if(oldReplyData && oldReplyData.image) {
                {oldReplyData.image.map(async (data) => {
                    const oldImage = data.split("/").pop()?.split(".")[0]
                    await cloudinary.uploader.destroy(oldImage as string)
                })}
            }

            const deleteReply = await this.ReplyRepository.delete({
                where: { id: replyId }
            })

            return res.status(200).json({
                code: 200,
                status: "Success",
                message: "Delete Replay Success",
                data: deleteReply
            })
        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: error })
        }
    }
}