var app = getApp();
module.exports = {
  ctx:null,
  url: app.globalData.config.cdnHost+'start.mp3',
  run( ctx ){
    this.ctx = ctx;
    ctx.setSrc(this.url);
    ctx.seek(0);
    ctx.play();
    console.log('开始页面播放');
  },
  pause() {
    (this.ctx||{pause:function(){}}).pause();
  },
  play() {
    this.ctx.play();
  }
}