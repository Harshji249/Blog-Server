const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    password:{
        type:String,
        required:true
    },
    email:{
        type: String,
    },
    file: {
        type: String,
        required: true
    },
    likedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'blog' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    slackAccessToken:{
        type:String,
        default:''
    }
})
const user = mongoose.model("User", userSchema)
user.createIndexes
module.exports = user