const express = require('express')
const router = express.Router()
const { body } = require('express-validator');
const fetchuser = require('../middleware/fetchuser');
const { addNewPost,viewAllPost,viewUserPost,updatePost,deletePost,likePost,addComment, viewMyPost,followUser } = require('../controllers/BlogControllers');

//Create a new blog post: POST "/api/blog/addnewpost" 
router.post('/addnewpost',[
],fetchuser,addNewPost)
 
// View all posts : GET "/api/blog/viewallpost"
router.get('/viewallpost',fetchuser, viewAllPost)

// View posts of specific user : GET "/api/blog/viewuserpost"
router.get('/viewuserpost/:id',[
], viewUserPost)

// View your posts  : GET "/api/blog/viewmypost"
router.get('/viewmypost',fetchuser ,viewMyPost)


// Update a post : PUT "/api/blog/updatepost"
router.put('/updatepost/:id',[
],fetchuser,updatePost)

// Delete a post : DELETE "/api/blog/deletepost"
router.delete('/deletepost/:id'
,fetchuser,deletePost)

// Like a users post : POST "/api/blog/likepost"
router.post('/likepost/:id',fetchuser,likePost)

// Comment on a users post : POST "/api/blog/addcomment"
router.post('/addcomment/:id',fetchuser,addComment)

// Follow a user profile : POST "/api/blog/follow"
router.post('/follow/:id',fetchuser, followUser)

module.exports = router