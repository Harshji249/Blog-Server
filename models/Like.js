const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  blogId: { type: mongoose.Schema.Types.ObjectId, ref: 'blog', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  date: {
    type: Date,
    default: Date.now
},
});

const like = mongoose.model('Like', likeSchema);
like.createIndexes
module.exports = like;