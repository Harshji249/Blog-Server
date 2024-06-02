const User = require("../models/User");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cloudinary = require("cloudinary").v2;
const JWT_SECRET = "secretjwtstring";
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

module.exports = {
  loginUser,
  createUser,
  editUser,
};
