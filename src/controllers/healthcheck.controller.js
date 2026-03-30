import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import { Tweet } from "../models/tweet.model.js";
import mongoose, { isValidObjectId }  from "mongoose"

const healthcheck = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse
            (
                200, { message: "Everything is Ok" }, "OK"
            )
        )
})

export { healthcheck }