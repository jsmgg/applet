module.exports = {
  ctx:null,
  init( key ){
    var ctx = wx.createVideoContext('js_video'+key);
    ctx.play();
    this.ctx = ctx;
  },
  pause(){
    this.ctx && this.ctx.pause();
  },
  play(){
    this.ctx && this.ctx.play();
  },
  seek( seek ){
    this.ctx && this.ctx.seek( seek );
  }
}