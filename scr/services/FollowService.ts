import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient()

function isValidUUID(uuid: string): boolean {
    const UUIDRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
   
    return UUIDRegex.test(uuid)
}

export default new class FollowService {
    private readonly UserRepository = prisma.user
    private readonly UserFollowingRepository = prisma.userFollowing

    async follow(req: Request, res: Response): Promise<Response> {
        try {
            const followingId = req.params.followingId

            if (!isValidUUID(followingId)) {
                return res.status(400).json({ message: "Invalid UUID" })
            }

            const userId = res.locals.loginSession.User.id

            if (followingId == userId) return res.status(400).json({ message: "You cant follow your self" })

            const followingUser = await this.UserRepository.findUnique({
                where: {
                    id: followingId
                }
            })

            if (!followingUser) return res.status(404).json({ message: "User no found" })

            const followerUser = await this.UserRepository.findUnique({
                where: {
                    id: userId
                }
            })

            if (!followerUser) return res.status(404).json({ message: "User no found" })

            const exitingFollow = await this.UserFollowingRepository.findFirst({
                where: {
                    followerId: userId,
                    followingId: followingId
                }
            })

            if(exitingFollow){
                await this.UserFollowingRepository.delete({
                    where: {
                        id:exitingFollow.id
                    }
                })
                return res.status(200).json({message: "You unfollow this user"})
            }

            const followUser = await this.UserFollowingRepository.create({
                data: {
                    followerId: userId,
                    followingId: followingId,
                    isFollow: true
                }
            })

            return res.status(201).json({
                code: 201,
                status: "Success",
                message: "Follow User Success",
                data: followUser
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: error })
        }
    }
}