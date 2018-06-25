var app = getApp();
var Util = require('../../../../utils/util.js');
module.exports = {
  url:app.globalData.config.cdnHost+'30s.mp3',
  ctx:null,
  windowWidth:0,
  count:30,
  startTime : 0,
  audioCtx:null,
  init( audioCtx,cb ){
    this.cb = cb;
    this.audioCtx = audioCtx;
    audioCtx.setSrc(this.url);
    //this.count = 30;//count;
    this.ctx = wx.createCanvasContext('js_loadingimg');
    clearTimeout(this.timer);
    if (this.windowWidth){
      this.startTime = Date.now();
      this.draw( this.windowWidth );
      this.playAudio();
    } else {
      app.getSystemInfo().then(res => {
        this.windowWidth = res.windowWidth;
        this.startTime = Date.now();
        this.draw(this.windowWidth);
        this.playAudio();
      })
    }
  },
  playAudio(){
    this.audioCtx.play();
  },
  cbNum:0,
  draw( windowWidth ){
    var ctx = this.ctx;;
    var width = Util.rpx_to_px(330, windowWidth) | 0;
    var borderWidth = Util.rpx_to_px(15, windowWidth)|0;
    var radius = Util.rpx_to_px((300-30)/2, windowWidth) | 0;
    var total = this.count*1000;
    var time = Date.now() - this.startTime;
    
    if (time >= total) {
      clearTimeout(this.timer);
      return this.cb(0);
    }else{
      var cbNum = Math.ceil((total - time) / 1000);
      if (cbNum != this.cbNum){
        this.cb(cbNum);
        this.cbNum = cbNum;
      }
    }
    ctx.clearRect(0, 0, width, width);
    ctx.beginPath();
    ctx.setStrokeStyle('#f2f2f2');
    ctx.setLineWidth(borderWidth);
    ctx.arc(radius + 15, radius + 15, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.setStrokeStyle('#2cb190');
    ctx.setLineWidth(borderWidth);
    ctx.arc(radius + 15, radius + 15, radius, -Math.PI / 2 + Math.PI*2*time/total, Math.PI*3/2);
    ctx.stroke();
    ctx.closePath();
    ctx.draw();
    
    this.timer = setTimeout(()=>{
      this.draw(windowWidth);
    },40);
  },
  timer : null,
  start(){
    this.draw(this.windowWidth);
    this.audioCtx && this.audioCtx.play();
  },
  stop(){
    clearTimeout( this.timer );
    this.audioCtx && this.audioCtx.pause();
  }
}