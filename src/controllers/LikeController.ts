import { Request, Response } from "express"
import LikeService from "../services/LikeService"

export  default new class LikeController {
    like(req: Request, res: Response ) {
        LikeService.like(req,res)
    }
}