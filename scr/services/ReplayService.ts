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

    async addReply(req: Request, res: Response): Promise<Response> {
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

            const image = req.file
            let image_url = ""

            if (!image) {
                image_url = ""
            } else {
                const cloudinaryUpload = await cloudinary.uploader.upload(image.path, {
                    folder: "Circle53"
                })
                image_url = cloudinaryUpload.secure_url
                fs.unlinkSync(image.path)
            }

            const newReply = await this.ReplyRepository.create({
                data: {
                    content: body.content,
                    image: image_url,
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
                    replies: { connect: { id: newReply.id } }
                }
            })

            return res.status(200).json({
                code: 200,
                status: "Success",
                message: "Add Replay Success",
                data: newReply
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: error })
        }
    }

    async updateReply(req: Request, res: Response): Promise<Response> {
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

            const image = req.file
            let image_url = ""


            const oldReplyData = await this.ReplyRepository.findUnique({
                where: { id: replyId },
                select: { image: true }
            })

            if (image) {
                const cloudinaryUpload = await cloudinary.uploader.upload(image.path, {
                    folder: "Circle53"
                })
                image_url = cloudinaryUpload.secure_url
                fs.unlinkSync(image.path)

                if (oldReplyData && oldReplyData.image) {
                    const publicId = oldReplyData.image.split('/').pop()?.split('.')[0]
                    await cloudinary.uploader.destroy(publicId as string)
                }
            } else {
                image_url = oldReplyData?.image || ""
            }

            const updateReply = await this.ReplyRepository.update({
                where: { id: replyId },
                data: {
                    content: body.content,
                    image: image_url,
                    created_at: new Date()
                }
            })

            return res.status(200).json({
                code: 200,
                status: "Success",
                message: "Update Replay Success",
                data: updateReply
            })

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

            if (oldReplyData && oldReplyData.image) {
                const publicId = oldReplyData.image.split('/').pop()?.split('.')[0]
                await cloudinary.uploader.destroy(publicId as string)
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