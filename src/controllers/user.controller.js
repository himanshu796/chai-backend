import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"


// ********************** Generating Access & Refresh Tokens **************************
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh & access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {

    // **************** Steps to register user ******************
    // 1. get user details from frontend
    // 2. validation- not empty
    // 3. check if user already exists: username, email
    // 4. check for images, check for avatar
    // 5. upload image & avatar to cloudinary
    // 6. create user object- create entry in db
    // 7. remove password & refresh token field from response
    // 8. check for user creation
    // 9. return res

    // ************** Data coming from Form or JSON we use .body **********************
    // 1
    const { fullName, username, email, password } = req.body
    //console.log("email: ", email)

    // 2 ******* if any of these fields is an empty string, throws an error ********
    if (
        [fullName, username, email, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // 3
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    //console.log(req.files);

    // 4
    const avatarLocalPath = req.files?.avatar[0]?.path;   //.files comes from multer, first question mark is optional chaining 
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;  //***** showing error *****
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    // 5
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    // 6
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        username: username.toLowerCase(),
        password
    })

    // 7, 8
    const createdUser = await User.findById(user._id).select("-password -refreshToken") //.select is used to not get these fields which are written using -(minus sign) inside parentheses

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    // 9
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {

    //**************** Steps to login User ***************************
    // 1. get data from req body
    // 2. check username or email
    // 3. find the user
    // 4. if we get the user then we check for password
    // 5. generate & give access and refresh token to user
    // 6. send tokens to secure cookies
    // 7. send res

    // 1
    const { email, username, password } = req.body

    // 2
    if (!username || !email) {
        throw new ApiError(400, "Username or email is required")
    }

    // 3
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    // 4
    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    // 5
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    // optional step
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken") //.select is used to not get these fields which are written using -(minus sign) inside parentheses

    // 6
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged in successfully"
            )
        )
})

// ********************** Logout user **********************
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user_id, {
        $set: {
            refreshToken: undefined
        }
    },
        {
            new: true
        })

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"))
})

export {
    registerUser,
    loginUser,
    logoutUser
}