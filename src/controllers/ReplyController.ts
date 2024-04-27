import { Request, Response } from "express"
import ReplyService from "../services/ReplayService"

export default new class ReplyController {
    addReply(req: Request, res: Response) {
        ReplyService.addReply(req, res)
    }
    updateReply(req: Request, res: Response) {
        ReplyService.updateReply(req, res)
    }
    deleteReply(req: Request, res: Response) {
        ReplyService.deleteReply(req, res)
    }
}