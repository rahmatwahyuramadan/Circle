import * as express from "express"
import * as path from "path"
import AuthController from "../controllers/AuthController"
import UserController from "../controllers/UserController"
import AuthMiddelware from "..//middlewares/AuthMiddleware"
import ThreadController from "../controllers/ThreadController"
import FollowController from "../controllers/FollowController"
import LikeController from "../controllers/LikeController"
import ReplyController from "../controllers/ReplyController"
import upload from "../middlewares/UploadMiddleware"

const router = express.Router()

// Auth
router.post("/register", AuthController.register)
router.post("/login", AuthController.login)
router.post("/logout", AuthMiddelware.Auth, AuthController.logout)
router.post("/check", AuthMiddelware.Auth, AuthController.check)

//User
router.get('/findUser', AuthMiddelware.Auth, UserController.findAll)
router.get('/finduserbyid/:userId', AuthMiddelware.Auth, UserController.findById)
router.get('/finduserbyname/:name', AuthMiddelware.Auth, UserController.findByName)
router.get('/userprofilenoimage/:userId', AuthMiddelware.Auth, UserController.updateWithoutImage)
router.get('/userprofilewuthimage/:userId', AuthMiddelware.Auth, upload.single('image'), UserController.uploadProfilePicture)
router.delete('/deleteUser/:userId', AuthMiddelware.Auth, UserController.delete)
router.get("/get_suggested_user", AuthMiddelware.Auth, UserController.getSuggestedUser)

// Follow
router.post('/follow/:followingId',AuthMiddelware.Auth, FollowController.follow)

// Like
router.post('/thread/:threadId/like',AuthMiddelware.Auth, LikeController.like)

// Reply
router.post("/addreply/:threadId", AuthMiddelware.Auth, upload.array('image', 10), ReplyController.addReply)
router.post("/updatereply/:threadId/reply/:replyId", AuthMiddelware.Auth, upload.array('image', 10), ReplyController.updateReply)
router.delete('/deletereply/:replyId', AuthMiddelware.Auth, ReplyController.deleteReply)

// Thread
router.get('/findallthread/:page', AuthMiddelware.Auth, ThreadController.findAll)
router.get('/findthreadbyid/:threadId', AuthMiddelware.Auth, ThreadController.findById)
router.post("/addthread/:id", AuthMiddelware.Auth, upload.array('image', 10), ThreadController.addThread)
router.post("/updatethread/:threadId", AuthMiddelware.Auth, upload.array('image',10), ThreadController.updateThread)
router.delete('/deletethread/:threadId', AuthMiddelware.Auth, ThreadController.deleteThread)

// Thread Queue
router.post("/addthreadqueue/:userId", AuthMiddelware.Auth, upload.array('image', 10), ThreadController.addThreadQueue)

// Thread Redis
router.get('/threadredis/:page', AuthMiddelware.Auth, ThreadController.findAllRedis)

router.use('/uploads', express.static(path.join(__dirname, 'uploads')))

export default router