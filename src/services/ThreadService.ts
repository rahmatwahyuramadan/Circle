import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import cloudinary from '../config'
import * as fs from "fs"
import { addthread } from "../utils/ThreadUtils"
import redisClient, { DEFAULT_EXPIRATION } from "../cache/redis"

const prisma = new PrismaClient()

function isValidUUID(uuid: string): boolean {
    const UUIDRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
   
    return UUIDRegex.test(uuid)
}

let isRedisConnected = false
async function redisConnectedDone() {
    if (!isRedisConnected) {
        try {
            await redisClient.connect()
            isRedisConnected = true
        } catch (error) {
            console.log("Error connecting to redis", error);

        }
    }
}

export default new class ThreadService{
    private readonly UserRepository = prisma.user
    private readonly ThreadRepository = prisma.thread
    private readonly LikeRepository = prisma.like
    private readonly ReplyRepository = prisma.reply
    private readonly UserFollowingRepository = prisma.userFollowing

    async findAllRedis(req: Request, res: Response): Promise<Response> {
        try {
            redisConnectedDone()
            const page = parseInt(req.params.page) || 1
            const pageSize = 10
            const skip = (page - 1) * pageSize

            const cacheKey = `threads_page_${page}`
            if (!cacheKey) return res.status(404).json({ message: "KEY not Found" })

            const cacheData = await redisClient.get(cacheKey)

            if (cacheData) {
                const threads = JSON.parse(cacheData)

                const findthreads = await this.ThreadRepository.findMany({
                    skip,
                    take: pageSize,
                    include: {
                        user: true,
                        Like: true,
                        replies: true
                    },
                    orderBy: {
                        created_at: 'desc'
                    }
                })

                const totalThread = await this.ThreadRepository.count()
                const totalPages = Math.ceil(totalThread / pageSize)

                // Mengecek apakah data yang ada di database ada data baru atau tidak
                if (
                    threads.data.length === findthreads.length &&
                    threads.pagination.totalThread == totalThread &&
                    threads.pagination.totalPages == totalPages &&
                    findthreads.every((findThread, index) => {
                        return findThread.content === threads.data[index].content &&
                            findThread.image.length === threads.data[index].image.length &&
                            findThread.image.every((image, imageIndex) => {
                                return image === threads.data[index].image[imageIndex];
                            });
                    })
                ) {
                    // jika gak ada perubahan maka tampilkan data yang ada di redis
                    return res.status(200).json({
                        code: 200,
                        status: "Success",
                        message: "Find All CACHE Threads Success",
                        data: threads
                    })
                } else {
                    // jika ada perubahan, maka data yang ada di redis akan dihapus dan ngambil data baru
                    await redisClient.del(cacheKey)
                }
            }

            // Ngambil data ulang dari database
            const threads1 = await this.ThreadRepository.findMany({
                skip,
                take: pageSize,
                include: {
                    user: true,
                    Like: true,
                    replies: true
                },
                orderBy: {
                    created_at: 'desc'
                }
            })

            const totalThread = await this.ThreadRepository.count()
            const totalPages = Math.ceil(totalThread / pageSize)

            if (page > totalPages) return res.status(404).json({ message: "Page not found" })

            const threads2 = {
                data: threads1,
                pagination: {
                    totalThread,
                    totalPages,
                    currentPage: page,
                    pageSize
                }
            }

            redisClient.setEx(
                cacheKey,
                DEFAULT_EXPIRATION,
                JSON.stringify({
                    message: "Find All Cache Thread Success",
                    data: threads2.data,
                    pagination: threads2.pagination
                })
            )

            return res.status(200).json({
                code: 200,
                status: "Success",
                message: "Find All Threads Success",
                data: threads2
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: error })
        }
    }

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

    async addThread(req: Request, res: Response) {
        try {
            const body = req.body;
            const { error } = addthread.validate(body)
            if (error) return res.status(400).json({ message: error.message })

            const userId = res.locals.loginSession.User.id

            const userSelect = await this.UserRepository.findUnique({
                where: { id: userId }
            })
            if (!userSelect) return res.status(404).json({ message: "User not found" })

            let image = req.files
            let image_url : string[] = []

            if (image) {
                if (Array.isArray(image)) {
                    Promise.all(image.map(async (data) => {
                        const cloudinaryUpload = await cloudinary.uploader.upload(data.path, {
                            folder: "Circle53"
                        })
                        image_url.push(cloudinaryUpload.secure_url)
                        fs.unlinkSync(data.path)
                    })).then (async () => {
                        const newThread = await this.ThreadRepository.create({
                            data: {
                                content: body.content,
                                image: image_url,
                                user: { connect: { id: userId } }
                            }
                        })

                        return res.status(200).json({
                            code: 200,
                            status: "Add Thread Success!",
                            data: newThread
                        })
                    })
                }
            }else {
                image_url.push("")
                
                const newThread = await this.ThreadRepository.create({
                    data: {
                        content: body.content,
                        image: image_url,
                        user: { connect: { id: userId } }
                    }
                })

                return res.status(200).json({
                    code: 200,
                    status: "Add Thread Success!",
                    data: newThread
                })
            }

        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: error })
        }
    }

    async updateThread(req: Request, res: Response) {
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

            const thisThread = await this.ThreadRepository.findUnique({ where: { id: threadId } })

            if(!thisThread) return res.status(404).json({ message: "Thread Not Found!" })

            const body = req.body;
            const { error } = addthread.validate(body)
            if (error) return res.status(400).json({ message: error.message })

            const image = req.files
            let content = thisThread.content
            const imageURL: string[] = []

            if(body.content !== undefined && body.content !== "") {
                content = body.content
            }

            if(image) {
                if(Array.isArray(image)) {
                    Promise.all(image.map(async (data) => {
                        const cloudinaryUpload = await cloudinary.uploader.upload(data.path, {
                            folder: "Circle53"
                        })
                        imageURL.push(cloudinaryUpload.secure_url)
                        fs.unlinkSync(data.path)

                        if(thisThread && thisThread.image) {
                            {thisThread.image.map(async (data) => {
                                const oldImage = data.split("/").pop()?.split(".")[0]
                                await cloudinary.uploader.destroy(oldImage as string)
                            })}
                        }
                    })).then (async () => {
                        const updatedThread = await this.ThreadRepository.update({
                            where: { id: threadId },
                            data: {
                                content: content,
                                image: imageURL,
                                user: { connect: { id: userId } }
                            }
                        })

                        return res.status(200).json({
                            code: 200,
                            status: "Update Thread Success!",
                            data: updatedThread
                        })
                    })
                }
            }else {
                {thisThread.image.map((data) => {
                    imageURL.push(data)
                })}
                const updatedThread = await this.ThreadRepository.update({
                    where: { id: threadId },
                    data: {
                        content: content,
                        image: imageURL,
                        user: { connect: { id: userId } }
                    }
                })

                return res.status(200).json({
                    code: 200,
                    status: "Update Thread Success!",
                    data: updatedThread
                })
            }
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
            
            const thisThread = await this.ThreadRepository.findUnique({
                where: { id: threadId },
                select: {
                    image: true
                }
            })

            if (thisThread && thisThread.image) {
                {thisThread.image.map(async (data) => {
                    const oldImage = data.split("/").pop()?.split(".")[0]
                    await cloudinary.uploader.destroy(oldImage as string)
                })}
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