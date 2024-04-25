import { Request, Response } from "express"
import FollowService from "../services/FollowService"

export  default new class FollowController {
    follow(req: Request, res: Response ) {
        FollowService.follow(req,res)
    }
}