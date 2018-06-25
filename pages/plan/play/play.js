// play.js
var app = getApp();
var Start = require('/start/start.js');
var Play = require('/play/play.js');
var Wait = require('/wait/wait.js');
var FileCache = require('/util/FileCache.js');
var PlayCache = require('/util/PlayCache.js');
var Util = require('../../../utils/util.js');

var tmpData = {};

Page({

  /**
   * 页面的初始数据
   */
  data: {
    cdnHost:app.globalData.config.cdnHost,
    trainId:'',//埋点统计使用
    motionId:'',//动作id
    videoKey:(Math.random()+'').replace('0.','').substr(0,5),
    networkType:'',
    pageType:'',// start  play wait traing
    level: '',
    motionNum: '',
    duration: '',
    consume: '',
    trainName:'',
    motionName:'',
    videoStatus:0,
    intermission:0,//休息时间
    proWidth:0,//进度条
    proTime:0,//进度条动画剩余时间
    nextMotionName:'',//下一个动作名称
    startPage:{
      playIng:1
    },
    prev: 1,
    next: 1,
    url: '',
    time:'',
    playView:{
      playIng: 1
    }
  },
  currentIndex : [0,0],
  options : null,
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options){
    if (!options){
      app.errorLog({
        url:'optionsIsNull',
        page:'plan/play/play'
      });
      options = { type: app.globalData.planListData?'day':'plan'};
    }
    this.options = options;
    this.setData({
      cdnHost: app.globalData.config.cdnHost
    });
    app.getNetworkType().then( net=>{
      net = net.networkType;
      if( net != 'wifi' && net != 'none'){
        app.confirm({ content:'当前网络在非wifi下，确定播放？'}).then(res=>{
          if ( res.confirm ){
            this.load(options);
          } else {
            app.navigateBack();
          }
        })
      } else {
        if( net == 'none' ) {
          this.setData({ networkType:'none'});
        } else {
          this.load(options);
        }
        
      }
    });
    app.setKeepScreenOn();//设置常亮
  },
  onShow() {
    if (this.data.pageType == 'start') {

    } else if (this.data.pageType == 'play') {
      Play.play();
      this.setData({
        playView: {
          playIng: 1
        }
      });
    } else if (this.data.pageType == 'wait') {
      Wait.start();
    }
  },
  onHide(){
    if (this.data.pageType == 'start') {

    } else if (this.data.pageType == 'play') {
      Play.pause();
      this.setData({
        playView: {
          playIng: 0
        }
      });
    } else if (this.data.pageType == 'wait') {
      Wait.stop();
    }
  },
  onUnload(){
    if (this.data.pageType == 'start') {

    } else if (this.data.pageType == 'play') {
      Play.pause();
      this.setData({
        playView: {
          playIng: 0
        }
      });
    } else if (this.data.pageType == 'wait') {
      Wait.stop();
    }
    console.log('页面卸载');
  },
  load(options){
    wx.setNavigationBarTitle({ title: options.type == 'day' ? '基础训练' :'进阶选练'});
    this.formatData(options.type);

    if (tmpData.key){
      this.currentIndex = PlayCache.getIndexCache(options.type, tmpData.key) || this.currentIndex
    }
    console.log(['load', options.refresh , this.data.playView.playIng])
    if (options.refresh){//断网后重新链网接这上次播放的位置播放
      console.log( '断网后开始播放了' );
      return this.playAfter();
    }
    var video = this.getNowVideo();
    if (video.type == 5) {
      this.showStart();
    } else {
      this.loadFirstVideo(video.videoUrl);
    }
  },
  playAfter() {
    this.setData({
      networkType:'',
      pageType:'play'
    });
    Play.pause();
    this.js_next();
  },
  formatData( type ){
    var data ;
    if (type =='day') {
      data = app.globalData.planListData;
    } else {
      data = app.globalData.planListData_Plan;
      
      if ( !data.trainList ){
        data.trainList = data.list || [];
        data.motionNum = data.num;
        data.trainList.forEach(( train )=>{
          train.list = train.motionList||[];
        });
      }
      console.log(['formatData后：',data]);
    }
    var trainList = [];
    data.trainList.forEach((item)=>{//过滤没有视频的数据
      if(item.type==5 || (item.list && item.list.length)){
        if (item.list && item.list.length){
          var list = [];
          item.list.forEach(( video )=>{
            var groups = video.groups||1;
            while(groups--){//多组重复
              video.groups = 1;
              list.push( video );
            }
          });
          item.list = list;
        }
        trainList.push(item);
      }
    });
    data.trainList = trainList;
    tmpData = data;
  },
  loadFirstVideo: function ( url ) {
    //app.globalData.planListData
    app.loading('加载中...');
    FileCache.getLocalUrl( url ).then(res=>{
      if( res.code == 200 ){
        this.showStart(res.url );
      } else {
        app.loading();
        if (res.code == 500) {
          this.setData({
            networkType:'none'
          })
        } else {
          this.showStart(res.url);
          app.alert('请检查网络!30' + res.code);
        }
      }
    })
  },
  showStart( url ){
    var { level, motionNum, duration, consume, trainList} = tmpData;
    var trainName = url ? (trainList[this.currentIndex[0]].trainName || ''):'';
    var motionName = url ? (trainList[this.currentIndex[0]].list[this.currentIndex[1]].motionName || ''):'';
    var motionId = url ? (trainList[this.currentIndex[0]].list[this.currentIndex[1]].motionId || ''):'';
    this.setData({
      trainId:tmpData.id||'',
      motionId,
      networkType:'',
      pageType: 'start',
      level,
      motionNum,
      duration: duration||'',
      consume,
      trainName,
      motionName,
      startPage: {
        playIng: 1
      }
    });
    setTimeout(() => {
      app.loading();
      this.initStartPage(url);
    }, 50);
  },
  audioCtx : null,
  initStartPage( playVideo ) {//预备页面初始化
    this.audioCtx = this.audioCtx || wx.createAudioContext('myAudio');
    this.firstPlayVideo = playVideo;
    Start.run(this.audioCtx);
    this.audioTimer = setTimeout(()=>{
      Start.pause();
      this.js_audioEnd();
    },3000);
  },
  firstPlayVideo:null,
  audioTimer : null,
  js_audioEnd(){
    if( this.data.pageType == 'start'){
      clearTimeout(this.audioTimer);
      if(this.audioEnd) return;
      this.audioEnd = true;
      if (this.firstPlayVideo) {
        this.setData({
          pageType: 'play',
          videoStatus: 1,
          url: this.firstPlayVideo,
          prev: this.hasPrev(),
          next: this.hasNext(),
          startPage: {
            playIng: 1
          }
        });
        setTimeout(() => {
          Play.init(this.data.videoKey);
          this.loadNextVideo();
        }, 50)
      } else {
        this.playTraining(2);
      }
    } else {

    }
  },
  js_audioError( e ){
    this.js_audioEnd();
    app.errorLog({
      url:'audioError',
      pageType:this.data.pageType,
      serverData:JSON.stringify(e)
    })
  },
  playTraining( fig ){//fig:1,2,3  1上一个，2当前，3下一个
    var newCurrentIndex = [this.currentIndex[0], this.currentIndex[1]];
    if( fig == 1 ) {
      newCurrentIndex[0] = Math.max(newCurrentIndex[0] - 1,0);
      newCurrentIndex[1] = 0;
    } else if( fig == 3 ) {
      newCurrentIndex[0] = Math.min(newCurrentIndex[0] + 1, tmpData.trainList.length-1);
      newCurrentIndex[1] = 0;
    }
    var video = tmpData.trainList[newCurrentIndex[0]];
    this.currentIndex = newCurrentIndex;
    Play.pause();
    this.setData({
      trainingTime: video.duration,
      pageType: 'traing'
    });
    this.loadNextVideo();

    PlayCache.setIndexCache(this.options.type, tmpData.key, this.currentIndex);
  },
  getNowVideo(currentIndex){
    var currentIndex = currentIndex || this.currentIndex;
    var train = tmpData.trainList[currentIndex[0]];
    if (train.type==5){
      return train;
    }
    var video = train.list[currentIndex[1]];
    return video;
  },
  getNextVideo(){
    var currentIndex = this.currentIndex;
    var trainList = tmpData.trainList;
    var x = currentIndex[0];
    var y = currentIndex[1];
    if (trainList[x].type==5){
      y=0;
      x+=1;
      if (trainList[x].type == 5 || (trainList[x].type != 5 && trainList[x].list && trainList[x].list.length)){
        return trainList[x].type == 5 ? trainList[x] : trainList[x].list[y];
      }
    }
    if (trainList[x].list.length - 1 > y) {
      y += 1;
    } else {
      y = 0;
      x += 1;
    }
    if (trainList[x].type == 5){
      return trainList[x];
    }
    return trainList[x].list[y]||{};
  },
  loadNextVideo(){
    var currentIndex = this.currentIndex;
    var trainList = tmpData.trainList;
    var x = currentIndex[0];
    var y = currentIndex[1];
    if (trainList[x].type!=5 && (trainList[x].list||[]).length-1>y){
      y+=1;
    } else {
      y=0;
      x+=1;
    }
    if (!trainList[x]){
      //app.globalData.uploadVideoCache.time = Date.now();
      return;
    }
    if (trainList[x].type==5){
      return '';//this.loadNextVideo([x, 0]);
    }
    if (trainList[x] && trainList[x].list[y]) {
      var url = trainList[x].list[y].videoUrl;
      if( url ){
        FileCache.getLocalUrl(url).then(res => {
          if (res.code == 200) {
            //this.loadNextVideo([x, y]);
          } else if (res.code == 500) {
            app.toast('请检查网络');
          }
        });
      } else {
        //this.loadNextVideo([x, y]);
      }
       
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    this.onLoad(Object.assign(this.options,{refresh:true}) );
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
  
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
  
  },
  //开始页面音频控制按钮
  js_startPage(){
    /*var playIng = this.data.startPage.playIng;
    if (this.data.pageType!='start') return;
    this.setData({
      startPage:{
        playIng: playIng==1?0:1
      }
    });
    playIng == 1 ? Start.pause() : Start.play();*/
  },
  js_pause(){
    if (this.currentTime>10){
      var video = this.getNowVideo();
      var currentTime = this.currentTime;
      var duration = video.duration || 30;
      var proWidth = (currentTime -  10) / (duration - 10) * 100;
      this.setData({
        proWidth: proWidth+'%',
        proTime: 0,
        playView:{playIng:0}
      });
    } else {
      this.setData({
        proWidth: 0,
        proTime: 0,
        playView: { playIng: 0 }
      });
    }
    console.log(['pause', proWidth]);
  },
  js_end(){
    this.setData({
      proWidth:0,
      proTime:0
    });
    this.currentTime = 0;
    console.log(['js_end', 'this.hasNext():' + this.hasNext()]);
    if( this.hasNext() ){
      var train = tmpData.trainList[this.currentIndex[0]];
      var video = train.list[this.currentIndex[1]];
      this.audioCtx = wx.createAudioContext('myAudio');
      if (video.intermission){
        var next = this.getNextVideo();
        console.log(['next:', next])
        this.setData({
          pageType: 'wait',
          nextMotionName:next.motionName||next.trainName||''
        });
        Wait.init(this.audioCtx, (intermission) => {
          this.setData({
            intermission
          });
          if (intermission==0 ){
            this.js_next();
          }
        });
      } else {
        this.js_next();
      }
    } else {
      this.goPageDK();
    }
  },
  goPageDK(){
    if (this.options.type =='day'){
      PlayCache.setEnd(this.options.type, tmpData.key);

      app.redirectTo(`/pages/plan/resultNew/result?motionNum=${tmpData.motionNum}&duration=${tmpData.duration}&consume=${tmpData.consume}&type=${this.options.type}&key=${tmpData.key}`);

    } else {
      PlayCache.removeCache(this.options.type, tmpData.key);
      app.navigateBack();
    }
    
  },
  js_play(){
    if( this.currentTime>10 ) {
      var video = this.getNowVideo();
      var currentTime = this.currentTime;
      var duration = video.duration || 30;
      var proTime = duration - currentTime;
      this.setData({
        proWidth: '100%',
        proTime: proTime*1000,
        playView: { playIng: 1 }
      });
    }
    console.log('play');
  },
  currentTime : 0,
  js_update( e ){
    var video = this.getNowVideo();
    var currentTime = e.detail.currentTime;
    var duration = video.duration||30;
    var videoStatus = 1;
    var proWidth = '0';
    var proTime = 0;
    currentTime|=0;
    //console.log(['js_update', currentTime]);
    this.currentTime = currentTime;
    var time = '';
    if (currentTime<10) {
      time = 10 - currentTime;
      time = '00:'+(time>=10?time:'0'+time);
      if( currentTime >= 9 ){
        videoStatus = 2;
      }
      this.setData({
        proWidth: 0,
        proTime: 0,
        time,
        videoStatus
      });
    } else {
      videoStatus = 3;
      time = Math.max(duration - currentTime,0);
      var m = parseInt(time / 60);
      m = m<10?('0'+m):m;
      time%=60;
      time = time < 10 ? ('0' + time) : time;
      time = m + ':' + time;
      if (this.data.videoStatus == 2) {//确保在这里只设置一次
        proWidth = '100%';
        proTime = (duration - currentTime)*1000;
        this.setData({
          proWidth,
          proTime,
          time,
          videoStatus
        });
      } else {
        this.setData({
          time,
          videoStatus
        });
      }
    }
    this.setData({
      playView: { playIng: 1 }
    });
  },
  js_playView(){
    var playIng = this.data.playView.playIng;
    this.setData({
      playView: {
        playIng: playIng == 1 ? 0 : 1
      }
    });
    console.log(['js_playView', playIng == 1 ? 'Play.pause' :'Play.play']);
    playIng == 1 ? Play.pause() : Play.play();
    playIng != 1 && this.loadNextVideo();
  },
  js_traing_over(){
    if( this.hasNext() ){
      this.js_next();
    } else {
      this.goPageDK();
    }
  },
  play_busy : false,
  js_next(){
    var trainList = tmpData.trainList;
    var currentIndex = this.currentIndex;
    var newCurrent = [currentIndex[0], currentIndex[1]];
    Wait.stop();
    if (trainList[currentIndex[0]].type==5){
      newCurrent[0] = currentIndex[0] + 1;
      newCurrent[1] = 0;
    } else {
      if (currentIndex[1] == (trainList[currentIndex[0]].list || []).length - 1) {
        if (trainList.length > currentIndex[0] + 1) {
          newCurrent[0] = currentIndex[0] + 1;
          newCurrent[1] = 0;
        }
      } else if (currentIndex[1] < trainList[currentIndex[0]].list.length - 1) {
        newCurrent[0] = currentIndex[0];
        newCurrent[1] = currentIndex[1] + 1;
      }
    }

    if (this.play_busy) return;
    console.log(['js_next', 'next:' + newCurrent, 'now:' + currentIndex]);
    Play.pause();
    this.setData({
      playView: { playIng: 0 }
    });

    if (trainList[newCurrent[0]].type==5){
      this.playTraining(3);//有氧运动播放
    } else {
      this.play_busy = true;
      var url = trainList[newCurrent[0]].list[newCurrent[1]].videoUrl;
      this.play(newCurrent, url);
    }
  },
  play(newCurrent,url){
    var context = this;
    var trainList = tmpData.trainList;
    //Play.seek(0);
    //Play.pause();
    this.setData({
      proWidth: 0,
      proTime: 0,
      time:'00:10',
      playView: {
        playIng: 1
      }
    });
    FileCache.getCacheStatus(url).then(res => {
      //app.alert(res.code);
      if (res.code == 200) {
        setTimeout(()=>{//防止点击太频繁了
          go(newCurrent, res.url);
        },300);
      } else {
        app.loading({
          title:'加载中...',
          mask:true
        });
        FileCache.getLocalUrl(url).then(dt => {
          app.loading();
          if (dt.code == 500) {
            //app.toast( '请检查网络!' );
            context.setData({
              networkType:'none'
            });
            context.play_busy = false;
          } else {
            go(newCurrent, dt.url);
          }
        })
      }
    });
    function go(newCurrent, url){
      context.currentIndex = newCurrent;
      context.setData({
        motionId:trainList[newCurrent[0]].list[newCurrent[1]].motionId||'',
        pageType : 'play',
        url: url,
        time: '00:10',
        trainName: trainList[newCurrent[0]].trainName||'',
        motionName: trainList[newCurrent[0]].list[newCurrent[1]].motionName||'',
        prev: context.hasPrev(),
        next: context.hasNext()
      });
      setTimeout(() => {
        context.play_busy = false;
        context.loadNextVideo();
        Play.init( context.data.videoKey );
      }, 50);
      PlayCache.setIndexCache(context.options.type, tmpData.key, context.currentIndex)
    }
  },
  js_prev() {
    var trainList = tmpData.trainList;
    var currentIndex = this.currentIndex;
    var newCurrent = [currentIndex[0], currentIndex[1]];
    /*if (trainList[currentIndex[0] - 1] && trainList[currentIndex[0] - 1].type == 5) {//有氧的时候
      this.playTraining(1);//有氧运动播放
      return true;
    }*/
    if (this.play_busy) return;
    this.play_busy = true;
    if (currentIndex[1] == 0) {
      if (currentIndex[0] > 0) {
        newCurrent[0] = currentIndex[0] - 1;
        newCurrent[1] = Math.max((trainList[newCurrent[0]].list || []).length-1,0);
      }
    } else {
      newCurrent[1] = currentIndex[1] - 1;
    }
    console.log(['js_prev', 'prev:' + newCurrent, 'now:' + currentIndex]);
    
    if (trainList[newCurrent[0]].type==5) {
      this.play_busy = false;
      this.playTraining(1);//有氧运动播放
    } else {
      var url = trainList[newCurrent[0]].list[newCurrent[1]].videoUrl;
      this.play(newCurrent, url);
    }

  },
  hasNext(){
    var currentIndex = this.currentIndex;
    var trainList = tmpData.trainList;
    var list = trainList[currentIndex[0]].list;
    var has = false;
    if (trainList[currentIndex[0]] && trainList[currentIndex[0]].type == 5){//有氧的时候
      return !!trainList[currentIndex[0]+1];
    }
    if (list.length - 1 > currentIndex[1]){
      has = true;
    } else if (trainList.length - 1 > currentIndex[0]) {
      has = true;
    }
    return has;
  },
  hasPrev(){
    var currentIndex = this.currentIndex;
    return !(currentIndex[0] == 0 && currentIndex[1]==0);
  }
})