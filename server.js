/*聊天室  页面（express） + 消息通信(socket.io)  */
'use strict';
let express  = require('express'); //express是一个函数，调用后会返回一个HTTP的监听函数
let path = require('path');
let Message = require('./model').Message;

let app = express();

app.use(express.static(path.resolve('./node_modules')));//把node_modules作为静态文件根目录


app.get('/',function(req,res){  //当客户端通过get方式访问/路径时，服务器返回index.html文件
  res.sendFile(path.resolve('index.html')); //返回一个绝对路径
});

let server = require('http').createServer(app);  //创建一个HTTP服务器
let io = require('socket.io')(server);//创建一个io，并且把server作为参数传进来

let sockets = {};//存放着每个客户端的用户名和socket对象的对应关系

//监听客户端的连接,当连接到来的时候执行对应的回调函数
io.on('connect',function(socket){  //socket对象是每个客户端会专属有一个
  let username;  //此变量代表当前用户的用户名
  let currentRoom; //当前的房间名  只允许进入一个房间

  socket.on('message',function(msg){
    if(username){ //如果用户名已经赋值了

      let regexp = /@([^\s]+) (.+)/;
      let result = msg.match(regexp);
      if(result){ //如果可以匹配到说明是私聊
        let toUser = result[1]; //想要私聊的对方的用户名
        let content = result[2];//私聊的内容
        sockets[toUser].send({username,content,createAt:new Date().toLocaleString()})
      }else{
        //mongoose会自动添加生成时间，不用写createAt
        Message.create({username,content:msg},function(err,message){
          //有很多参数：_id username  content  createAt --version
          if(currentRoom){  //如果用户在某个房间内
            //在currentRoom这个房间内进行广播
            io.in(currentRoom).emit('message',message);
          }else{
            //在大厅广播
            io.emit('message',message);
          }
        });
      }
    }else{  //如果用户名还没有赋值 username还是undefined
      username = msg;//默认第一次的输入内容就是她的用户名
      sockets[username]=socket;//建立用户名和socket对象的对应关系
      //服务器把收到的消息广播给所有人  发送给所有客户端 通知所有人
      io.emit('message',{username:'系统',content:`欢迎${username}来到聊天室`,createAt:new Date().toLocaleString()});
    }
  });

  //服务器监听到消息 客户端想要获取之前的20条数据
  socket.on('getAllMessages',function(){
    Message.find().sort({createAt:-1}).limit(20).exec(function(err,messages){  //sort -1降序  1升序
      //查询出最近的20条数据messages并发送给客户端
      messages.reverse();//看消息要从旧往新 按时间看
      socket.emit('allMessage',messages);
    })
  });

  //监听客户端想加入房间的事件
  socket.on('join',function(roomName){
    if(currentRoom){//如果此客户端在某个房间内，则先让他离开那个房间
      socket.leave(currentRoom);
    }
    //让此socket对象进入此房间
    socket.join(roomName);
  });

  //监听客户端想删除某个消息的事件
  socket.on('delete',function(id){
    Message.remove({_id:id},function(err,result){
      io.emit('deleted',id); //告诉所有客户端，把这个id的消息删掉
    })
  })

});
server.listen(8080);
