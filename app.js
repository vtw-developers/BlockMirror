// 서버를 만들기 위한 기본 문법!
// const express = require('express');
import express from 'express';
import path from 'path';
const app = express();  //여기서 app을 어플리케이션이라고 합니다
// const path = require("path");

app.use(express.static('/home/euibin/workspace/LOFT/BlockMirror'));

// .listen(서버띄울 포트번호, 띄운 후 실행할 코드)
app.listen(3000, function() {
    console.log('listening on 3000')
}); 

app.get("/", function(req, res){
    res.sendFile("/home/euibin//workspace/LOFT/BlockMirror/docs/index.html");
});