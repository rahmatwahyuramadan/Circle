import ThreadService from "../services/ThreadService";
import { Request, Response } from "express";
import ThreadsQueue from "../queue/ThreadsQueue"

export default new class ThreadController{
    findAll(req: Request, res: Response ) {
        ThreadService.findAll(req,res)
    }
    findById(req: Request, res: Response) {
        ThreadService.findById(req, res)
    }
    addThread(req: Request, res: Response) {
        ThreadService.addThread(req, res)
    }
    updateThread(req: Request, res: Response) {
        ThreadService.updateThread(req, res)
    }
    deleteThread(req: Request, res: Response) {
        ThreadService.deleteThread(req, res)
    }
    findAllRedis(req: Request, res: Response) {
        ThreadService.findAllRedis(req, res)
    }
    addThreadQueue(req: Request, res: Response) {
        ThreadsQueue.addThreadQueue(req, res)
    }
}