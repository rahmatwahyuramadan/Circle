import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient()

function isValidUUID(uuid: string): boolean {
    const UUIDRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
    return UUIDRegex.test(uuid)
}

export default new class LikeService {
    private readonly LikeRepository = prisma.like
    private readonly UserRepository = prisma.user
    private readonly ThreadRepository = prisma.thread

    async like(req: Request, res: Response): Promise<Response> {
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
                },
                include: {
                    Like: true
                }
            })
            if (!threadSelected) return res.status(404).json({ message: "Thread no found" })

            const exitingLike = threadSelected.Like.find(like => like.user_id === userId)

            if (exitingLike) {
                await this.LikeRepository.delete({
                    where: {
                        id: exitingLike.id
                    }
                })

                await this.ThreadRepository.update({
                    where: { id: threadId },
                    data: {
                        isLiked: false
                    }
                })

                return res.status(200).json({
                    code: 200,
                    status: "Success",
                    message: "Undo Like Thread Success",
                })
            }

            const likeThread = await this.LikeRepository.create({
                data: {
                    user_id: userSelected.id,
                    thread_id: threadSelected.id
                }
            })

            await this.ThreadRepository.update({
                where: { id: threadId },
                data: {
                    isLiked: true
                }
            })

            return res.status(200).json({
                code: 200,
                status: "Success",
                message: "Like Thread Success",
                data: likeThread
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: error })
        }
    }
}