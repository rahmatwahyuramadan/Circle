import { Request, Response } from "express"
import UserService from "../services/UserService"

export default new class UserController {
    findAll(req: Request, res: Response) {
        UserService.findAll(req, res)
    }
    findById(req: Request, res: Response) {
        UserService.findById(req, res)
    }
    findByName(req: Request, res: Response) {
        UserService.findByName(req, res)
    }
    updateWithoutImage(req: Request, res: Response) {
        UserService.updateWithoutImage(req, res)
    }
    uploadProfilePicture(req: Request, res: Response) {
        UserService.uploadProfilePicture(req, res)
    }
    getSuggestedUser(req: Request, res: Response) {
        UserService.getSuggestedUser(req, res)
    }
    delete(req: Request, res: Response) {
        UserService.delete(req, res)
    }
}