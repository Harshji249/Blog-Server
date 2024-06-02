const Blog = require("../models/Blog");
const User = require("../models/User");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const { validationResult } = require("express-validator");

const addNewPost = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { title, description } = req.body;
    const blog = new Blog({
      title,
      description,
      user: req.user.id,
    });

    const savedBlog = await blog.save();

    return res
      .json({ status:200,savedBlog, message: "Blog Posted Successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const viewAllPost = async (req, res) => {
    try {
      const blogs = await Blog.find().populate({
        path: "user",
        select: "name email file", // Include only the name field of the user
      }).populate({
        path: "comments",
        populate: {
          path: "userId",
          select: "name email file",
        },
      });
  
      res.json({status :200,
        message: "All blogs listed successfully",
        blogs,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal server error occurred");
    }
  };
  

const viewUserPost = async (req, res) => {
  try {
    const blogs = await Blog.find({ user: req.params.id }).populate({
      path: "comments",
      populate: {
        path: "userId",
        select: "name email file",
      },
    });

    const user = await User.findById(req.params.id);
    res.status(200).json({
      message: "User blogs listed successfully",
      blogs,
      user,
    });
  } catch (err) {
    res.status(500).send("Internal server error occured");
  }
};

const viewMyPost = async (req, res) => {
    try {
      const blogs = await Blog.find({ user: req.user.id }).populate({
        path: "comments",
        populate: {
          path: "userId",
          select: "name email file",
        },
      });
  
      res.status(200).json({
        message: "User blogs listed successfully",
        blogs,
      });
    } catch (err) {
      res.status(500).send("Internal server error occured");
    }
  };


const updatePost = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const  title= req.body.payload.title;
    const  description= req.body.payload.description;
    const updateBlog = {};
    if (title) updateBlog.title = title;
    if (description) updateBlog.description = description;

    let blog = await Blog.findById(req.params.id);
    if (!blog) res.status(404).send("Not Found");
    blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { $set: updateBlog },
      { new: true }
    );
    res.status(200).json({ message: "Blog updated successfully", blog });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const deletePost = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const likePost = async (req, res) => {
  try {
    const blogId = req.params.id;
    const userId = req.user.id;
    const existingLike = await Like.findOne({ blogId, userId });
    if (existingLike) {
      return res
        .status(400)
        .json({ message: "User has already liked this post" });
    }

    const like = new Like({ blogId, userId });
    const likedPost = await like.save();

    await Blog.findByIdAndUpdate(blogId, { $push: { likes: like._id } });
    await User.findByIdAndUpdate(userId, { $push: { likedPosts: postId } });
    return res.status(200).json({ message: "Post Liked", likedPost });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const addComment = async (req, res) => {
  try {
    const blogId = req.params.id;
    const userId = req.user.id;
    const { content } = req.body;
    const comment = new Comment({ blogId, userId, content });
    const commentAdded = await comment.save();

    await Blog.findByIdAndUpdate(blogId, { $push: { comments: comment._id } });
    return res.status(200).json({ message: "Post Liked", commentAdded });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  addNewPost,
  viewAllPost,
  viewUserPost,
  updatePost,
  deletePost,
  likePost,
  addComment,
  viewMyPost
};
