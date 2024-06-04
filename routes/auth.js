const express = require('express')
const router = express.Router()
const { body } = require('express-validator');
const multer = require('multer');
const fetchuser = require('../middleware/fetchuser');
const { loginUser,createUser,editUser ,slackAuth, oAuthCallback,getAllChannels,setChannel} = require('../controllers/AuthControllers');
const path = require('path');
const destinationPath = path.join(__dirname, '../public/images');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        return cb(null, destinationPath);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
});

const upload = multer({ storage: storage });
//Login an existing user : POST "/api/auth/loginuser" 
router.post('/loginuser',[
    body('email', 'Enter a valid Email').isEmail(),
    body('password', 'Enter valid password').isLength({ min: 5 }),
], loginUser)
 
// Create a new user : POST "/api/auth/createuser"
router.post('/registeruser',upload.single('file'),[
    body('name', 'Name should be atleast 3 characters').isLength({ min: 3 }),
    body('email', 'Enter a valid Email').isEmail(),
    body('password', 'Password should be atleast 3 characters').isLength({ min: 5 }),
], createUser)

// Edit user profile : PUT "/api/auth/edituser"
router.post('/edituser/:id',upload.single('file'), editUser)

router.get('/slack', fetchuser,slackAuth)

router.put('/slack/callback',oAuthCallback)

router.get('/slack/channels', fetchuser,getAllChannels)

router.post('/slack/set-channel', fetchuser,setChannel)




module.exports = router