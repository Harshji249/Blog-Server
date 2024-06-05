const User = require("../models/User");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cloudinary = require("cloudinary").v2;
const JWT_SECRET = "secretjwtstring";
const axios = require('axios')
require("dotenv").config();


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CLIENT_ID = "7220419783171.7216518526950";
const CLIENT_SECRET = 'f083f69a8908f9554df908a34b5d8439';
const REDIRECT_URI = 'https://blog-server-g55n.onrender.com/api/auth/slack/callback';

const loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Loggin with correct credentials" });
    }
    const passwordCompare = await bcrypt.compare(password, user.password);
    if (!passwordCompare) {
      return res.status(400).json({ error: "Loggin with correct credentials" });
    }
    const data = {
      user: {
        id: user.id,
      },
    };
    const authToken = jwt.sign(data, JWT_SECRET);
    res.json({ status: 200, authToken, user, rejistered: true });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const createUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { name, email, password } = req.body;
    const file = req?.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    await cloudinary.uploader.upload(file.path, async (err, result) => {
      const userEmail = await User.findOne({ email });
      if (userEmail) {
        return res
          .status(400)
          .json({ error: "User with this email already exists" });
      }
      const salt = await bcrypt.genSalt(10);
      const secPass = await bcrypt.hash(password, salt);
      let user = new User({
        name: name,
        email: email,
        password: secPass,
        file: result.url,
      });
      user = await user.save();
      const data = {
        user: {
          id: user.id,
        },
      };
      const authToken = jwt.sign(data, JWT_SECRET);
      res.json({
        status: 200,
        message: "User created successfuly",
        authToken,
        user,
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error occured");
  }
};

const editUser = async (req, res) => {
  try {
    const { name, email } = req.body;
    const file = req?.file;

    if (file) {
      await cloudinary.uploader.upload(file.path, async (err, result) => {
        const updateUser = {};
        if (name) updateUser.name = name;
        if (email) updateUser.email = email;
        if (file) updateUser.file = result.url;
        let user = await User.findById(req.params.id);
        if (!user) res.status(404).send("Not Found");

        user = await User.findByIdAndUpdate(
          req.params.id,
          { $set: updateUser },
          { new: true }
        );
        res.json({ status: 200, message: "User updated successfully", user });
      });
    } else {
      const updateUser = {};
      if (name) updateUser.name = name;
      if (email) updateUser.email = email;

      let user = await User.findById(req.params.id);
      if (!user) res.status(404).send("Not Found");
      user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: updateUser },
        { new: true }
      );
      res.json({ status: 200, message: "User updated successfully", user });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error occured");
  }
};

const slackAuth = (req, res) => {
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${CLIENT_ID}&scope=channels:read,chat:write&redirect_uri=${REDIRECT_URI}&state=${req.user.id}`;
  res.json({ redirectUrl: slackAuthUrl });
}

const oAuthCallback = async (req, res) => {
  const { code, state } = req.query;

  try {
    const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      },
    });

    if (!response.data.ok) {
      throw new Error(response.data.error);
    }

    const accessToken = response.data.access_token;

    const updatedUser = await User.findByIdAndUpdate(state, { slackAccessToken: accessToken }, { new: true });

    if (!updatedUser) {
      return res.status(404).send('User not found');
    }

    res.send('Slack account connected successfully!');
  } catch (error) {
    console.error('Error during Slack OAuth:', error.message);
    res.status(500).send('Error connecting Slack account');
  }
};

const getAllChannels =  async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    const response = await axios.get('https://slack.com/api/conversations.list', {
      headers: { Authorization: `Bearer ${user.slackAccessToken}` },
    });

    const channels = response.data.channels;
    res.json(channels);
  } catch (error) {
    console.error('Error fetching Slack channels:', error);
    res.status(500).send('Error fetching Slack channels');
  }
}

const setChannel =async (req, res) => {
  try {
    const { channelId } = req.body;
    const userId = req.user.id;
    await User.findByIdAndUpdate(userId, { slackChannelId: channelId });
    res.send('Slack channel set successfully!');
  } catch (error) {
    console.error('Error setting Slack channel:', error);
    res.status(500).send('Error setting Slack channel');
  }
}


const sendSlackNotification = async (userId, message) => {
  try {
    const user = await User.findById(userId);

    if (user.slackAccessToken && user.slackChannelId) {
      const response = await axios.post('https://slack.com/api/chat.postMessage', {
        channel: user.slackChannelId,
        text: message,
      }, {
        headers: { Authorization: `Bearer ${user.slackAccessToken}` },
      });

      if (!response.data.ok) {
        console.error('Slack API error:', response.data.error);
      } else {
        console.log('Message posted successfully:', response.data);
      }
    } else {
      console.error('Missing Slack access token or channel ID');
    }
  } catch (error) {
    console.error('Error sending Slack notification:', error);
  }
};



module.exports = {
  loginUser,
  createUser,
  editUser,
  slackAuth,
  oAuthCallback,
  getAllChannels,
  setChannel,
  sendSlackNotification,
};
