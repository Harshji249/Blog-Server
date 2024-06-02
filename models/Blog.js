const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    title: {
        type: String,
        required: true
    },
    description:{
        type:String,
        required:true,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Like' }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    date: {
        type: Date,
        default: Date.now
    },
})
const blog = mongoose.model("Blog", blogSchema)
blog.createIndexes
module.exports = blog