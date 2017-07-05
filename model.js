'use strict';
let mongoose = require('mongoose');
mongoose.Promise = Promise;
//1,连接数据库  需要先启动mongo
// mongoose.connect('mongodb://localhost/chatRoom');
let promise = mongoose.connect('mongodb://localhost/chatRoom', {
  useMongoClient: true,
  /* other options */
});

//2，定义Schema
let MessageSchema = new mongoose.Schema({
  username:String,
  content:String,
  createAt:{type:Date,default:Date.now}
});

//3,定义model并导出

  let Message = mongoose.model('Message',MessageSchema);
  exports.Message = Message;
