import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


// *************** Like/Unlike a video *****************
const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const likedAlready = await Like.findOne({    // *** search DB for existing like
        video: videoId,
        likedBy: req.user?._id
    })

    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready?._id) // *** If a like exists delete that like document from DB.

        return res
            .status(200)
            .json(new ApiResponse(
                200, { isLiked: false }
            ))
    }

    await Like.create({    // ******* if no existing like then create new document
        video: videoId,
        likedBy: req.user?._id
    })

    return res
        .status(200)
        .json(new ApiResponse(
            200, { isLiked: true }
        ))
})

// ************ Like/Unlike a comment in a video *************
const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    const likedAlreadyComment = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id
    })

    if (likedAlreadyComment) {
        await Like.findByIdAndDelete(likedAlreadyComment?._id)

        return res
            .status(200)
            .json(new ApiResponse(
                200, { isLiked: false }
            ))
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user?._id
    })

    return res
        .status(200)
        .json(new ApiResponse(
            200, { isLiked: true }
        ))
})

// *************** Like/Unlike a tweet ***************************
const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }

    const likedAlreadyTweet = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    if (likedAlreadyTweet) {
        await Like.findByIdAndDelete(likedAlreadyTweet?._id)

        return res
            .status(200)
            .json(new ApiResponse(
                200, { tweetId, isLiked: false }
            ))
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id
    })
    return res
        .status(200)
        .json(new ApiResponse(
            200, { isLiked: true }
        ))
})

// **************** Fetch all videos liked by the current user ********************
const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideosAggregate = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id)
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails"
                        }
                    },
                    {
                        $unwind: "$ownerDetails"
                    }
                ]
            }
        },
        {
            $unwind: "$likedVideo"
        },
        {
            $sort: {
                createdAt: -1
            },
        },
        {
            $project: {
                _id: 0,
                likedVideo: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        "avatar.url": 1
                    }
                }
            }
        }
    ])

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            likedVideosAggregate,
            "Liked videos fetched successfully"
        ))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}