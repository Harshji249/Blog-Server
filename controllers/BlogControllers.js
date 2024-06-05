const Blog = require("../models/Blog");
const User = require("../models/User");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const { validationResult } = require("express-validator");
const {sendSlackNotification,inviteBotToChannel} = require('./AuthControllers')

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

    const author = await User.findById(req.user.id).populate('followers');
    const notificationMessage = `${author.name} has published a new blog: ${title}`;

    for (const follower of author.followers) {
      sendSlackNotification(follower._id, notificationMessage);
    }

    return res.json({
      status: 200,
      savedBlog,
      message: "Blog Posted Successfully",
    });
  } catch (err) {
    console.error('Error posting blog:', err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const viewAllPost = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const currentUser = await User.findById(currentUserId).select("following");

    const blogs = await Blog.find()
      .populate({
        path: "user",
        select: "name email file",
      })
      .populate({
        path: "comments",
        populate: {
          path: "userId",
          select: "name email file",
        },
      });

    const blogsWithFollowInfo = blogs.map((blog) => {
      const isFollowing = currentUser.following.includes(blog.user._id);
      return {
        ...blog.toObject(),
        isFollowing,
      };
    });

    res.json({
      status: 200,
      message: "All blogs listed successfully",
      blogs: blogsWithFollowInfo,
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


    const userFollow = await User.findById(req.params.id).select('followers following');

    let userWithFollowers;
    try {
      userWithFollowers = await User.populate(userFollow, {
        path: 'followers',
        select: 'name email file'
      });
    } catch (populateError) {
      console.error('Error populating followers:', populateError);
      return res.status(500).send(`Error populating followers: ${populateError.message}`);
    }

    let userWithFollowing;
    try {
      userWithFollowing = await User.populate(userWithFollowers, {
        path: 'following',
        select: 'name email file'
      });
    } catch (populateError) {
      console.error('Error populating following:', populateError);
      return res.status(500).send(`Error populating following: ${populateError.message}`);
    }

    const user = await User.findById(req.params.id);
    res.status(200).json({
      message: "User blogs listed successfully",
      blogs,
      user,
      followers: userWithFollowing.followers,
      following: userWithFollowing.following
    });
  } catch (err) {
    res.status(500).send("Internal server error occured");
  }
};

const viewMyPost = async (req, res) => {
  try {
    const userId = req.user.id;

    const blogs = await Blog.find({ user: userId }).populate({
      path: "comments",
      populate: {
        path: "userId",
        select: "name email file",
      },
    });

    const user = await User.findById(userId).select('followers following slackChannelId');

    let userWithFollowers;
    try {
      userWithFollowers = await User.populate(user, {
        path: 'followers',
        select: 'name email file'
      });
    } catch (populateError) {
      console.error('Error populating followers:', populateError);
      return res.status(500).send(`Error populating followers: ${populateError.message}`);
    }

    let userWithFollowing;
    try {
      userWithFollowing = await User.populate(userWithFollowers, {
        path: 'following',
        select: 'name email file'
      });
    } catch (populateError) {
      console.error('Error populating following:', populateError);
      return res.status(500).send(`Error populating following: ${populateError.message}`);
    }

    res.status(200).json({
      message: "User blogs listed successfully",
      blogs,
      followers: userWithFollowing.followers,
      following: userWithFollowing.following,
      slackChannelId: userWithFollowing.slackChannelId
    });
  } catch (err) {
    console.error('Error occurred:', err);
    res.status(500).send("Internal server error occurred");
  }
};

const updatePost = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const title = req.body.payload.title;
    const description = req.body.payload.description;
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

    const blog = await Blog.findById(blogId).populate('user');
    const blogOwner = blog.user;

    const notificationMessage = `Your blog "${blog.title}" has received a new comment: ${content}`;
    sendSlackNotification(blogOwner._id, notificationMessage);

    return res.status(200).json({ message: "Comment added successfully", commentAdded });
  } catch (err) {
    console.error('Error adding comment:', err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const followUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user.id;

    const userToFollow = await User.findById(id);
    if (!userToFollow) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFollowing = await User.findOne({ _id: currentUser, following: id });

    if (isFollowing) {
      await User.findByIdAndUpdate(currentUser, { $pull: { following: id } });
      await User.findByIdAndUpdate(id, { $pull: { followers: currentUser } });
      return res.json({ status: 200, message: "Unfollow successful" });
    } else {
      await User.findByIdAndUpdate(currentUser, {
        $addToSet: { following: id },
      });
      await User.findByIdAndUpdate(id, {
        $addToSet: { followers: currentUser },
      });
      return res.json({ status: 200, message: "Follow successful" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFollowersAndFollowing = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .populate('followers', 'name email file')
      .populate('following', 'name email file');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      followers: user.followers,
      following: user.following,
    });
  } catch (error) {
    console.error('Error fetching followers and following:', error);
    res.status(500).send('Internal server error occurred');
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
  viewMyPost,
  followUser,
  getFollowersAndFollowing
};
