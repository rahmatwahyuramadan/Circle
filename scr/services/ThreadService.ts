import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import cloudinary from '../config'
import * as fs from "fs"
import { addthread } from "../utils/ThreadUtils"

const prisma = new PrismaClient()

function isValidUUID(uuid: string): boolean {
    const UUIDRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
   
    return UUIDRegex.test(uuid)
}

export default new class ThreadService{
    private readonly UserRepository = prisma.user
    private readonly ThreadRepository = prisma.thread
    private readonly LikeRepository = prisma.like
    private readonly ReplyRepository = prisma.reply
    private readonly UserFollowingRepository = prisma.userFollowing

    async findAll(req: Request, res: Response): Promise<Response>{
        try{
            const page = parseInt(req.params.page) || 1
            const pageSize = 10

            const skip = (page - 1) * pageSize

            const threads = await this.ThreadRepository.findMany({
                // 0
                skip,
                // 10
                take: pageSize,
                include: {
                    user: true,
                    Like: true,
                    replies: true
                },
                orderBy: {
                    created_at: 'desc'
                    // jika desc akan menampilkan data terbaru yaitu data dari waktu yang terbaru
                    // jika asc akan menampilkan data dari waktu yang lama
                }
            })

            // mengambil jumlah dari keseluruhan thread, misal thread ada 20, maka akan dihitung 20
            const totalThread = await this.ThreadRepository.count()

            // ini akan membagi keseluruhan thread dengan si total thread, misal 20 / 10 = 2
            const totalPages = Math.ceil(totalThread / pageSize)

            // melakukan pengecekan apakah si dari parameter, user input page yang berlebih dari yang ada di database
            // karena cuma ada 2 page yang tersedia, ketika user input page-nya 5, maka error
            // karena melebihi page yang tersedia
            if (page > totalPages) return res.status(404).json({ message: "Page not found" })

            // akan menampilkan thread dan pagination
            const threadss = {
                data: threads,
                pagination: {
                    totalThread,
                    totalPages,
                    currentPage: page,
                    pageSize
                }
            }

            return res.status(200).json({
                code: 200,
                status: "Success",
                message: "Find All Threads Success",
                data: threadss
            })
        }catch (error) {
            console.log(error);
            return res.status(500).json({ message: error })
        }
    }

    async findById (req: Request, res: Response): Promise<Response>{
        try{
            const threadId = req.params.threadId

            if(!isValidUUID(threadId)){
                return res.status(404).json({ message: "Invalid UUID" })
            }

            const thread = await this.ThreadRepository.findUnique({
                where: { id: threadId },
                include: {
                    user: true,
                    Like: true,
                    replies: {
                        include: {
                            user: true
                        }
                    }
                }
            })

            if (!thread) return res.status(404).json({ message: "thread not found" })

            return res.status(200).json({
                code: 200,
                status: "Success",
                message: "Find By ID Threads Success",
                data: thread
            })
    
    
        }catch (error) {
            console.log(error);
            return res.status(500).json({ message: error })
        }
    }

    async addThread(req: Request, res: Response): Promise<Response> {
        try {
            const body = req.body;
            const { error } = addthread.validate(body)
            if (error) return res.status(400).json({ message: error.message })

            const userId = res.locals.loginSession.User.id

            const userSelect = await this.UserRepository.findUnique({
                where: { id: userId }
            })
            if (!userSelect) return res.status(404).json({ message: "User not found" })

            let image = req.file
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

            const thread = await this.ThreadRepository.create({
                data: {
                    content: body.content,
                    image: image_url,
                    created_at: new Date(),
                    user: { connect: { id: userId } }
                }
            })

            return res.status(201).json({
                code: 201,
                status: "Success",
                message: "Add Threads Success",
                data: thread
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: error })
        }
    }

    async updateThread(req: Request, res: Response): Promise<Response> {
        try {
            const threadId = req.params.threadId

            if (!isValidUUID(threadId)) {
                return res.status(400).json({ message: "Invalid UUID" })
            }

            const userId = res.locals.loginSession.User.id

            const userSelect = await this.UserRepository.findUnique({
                where: { id: userId }
            })
            if (!userSelect) return res.status(404).json({ message: "User not found" })

            const body = req.body;
            const { error } = addthread.validate(body)
            if (error) return res.status(400).json({ message: error.message })

            let image = req.file
            let image_url = ""

            const oldThreadData = await this.ThreadRepository.findUnique({
                where: { id: threadId },
                select: { image: true }
            })

            if (image) {
                const cloudinaryUpload = await cloudinary.uploader.upload(image.path, {
                    folder: "Circle53"
                })
                image_url = cloudinaryUpload.secure_url
                fs.unlinkSync(image.path)

                if (oldThreadData && oldThreadData.image) {
                    const publicId = oldThreadData.image.split('/').pop()?.split('.')[0]
                    await cloudinary.uploader.destroy(publicId as string)
                }
            } else {
                image_url = oldThreadData?.image || ""
            }


            const threadUpdate = await this.ThreadRepository.update({
                where: { id: threadId },
                data: {
                    content: body.content,
                    image: image_url,
                    created_at: new Date(),
                    user: { connect: { id: userId } }
                }
            })

            return res.status(201).json({
                code: 201,
                status: "Success",
                message: "Update Threads Success",
                data: threadUpdate
            })
        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: error })
        }
    }

    async deleteThread(req: Request, res: Response): Promise<Response> {
        try {
            const threadId = req.params.threadId

            if (!isValidUUID(threadId)) {
                return res.status(400).json({ message: "Invalid UUID" })
            }

            const userId = res.locals.loginSession.User.id

            const userSelect = await this.UserRepository.findUnique({
                where: { id: userId }
            })
            if (!userSelect) return res.status(404).json({ message: "User not found" })

            const oldThreadData = await this.ThreadRepository.findUnique({
                where: { id: threadId },
                select: { image: true }
            })

            if (oldThreadData && oldThreadData.image) {
                const publicId = oldThreadData.image.split('/').pop()?.split('.')[0]
                await cloudinary.uploader.destroy(publicId as string)
            }

            const deletethread = await this.ThreadRepository.delete({
                where: { id: threadId }
            })

            return res.status(200).json({
                code: 200,
                status: "Success",
                message: "Delete Threads Success",
                data: deletethread
            })
        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: error })
        }
    }
}