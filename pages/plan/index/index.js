// index.js
var app = getApp();
var Util = require('../../../utils/util.js');
var PlayCache = require('../play/util/PlayCache.js');
var tipsMap = { morning:'早上好，',noon:'中午好，',afternoon:'下午好，',night:'晚上好，'};
var titleColorMap = { morning: '#07a97b', noon: '#f99204', afternoon: '#d21913', night: '#230d6b' };
Page({

  /**
   * 页面的初始数据
   */
  data: {
    networkType : '',
    typeStr:'',
    hasVideo:false,
    bottomMod:false,
    hasMore:false,
    planList:[]
  },
  options : null,
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.options = options;
    app.globalData.uploadVideoCache = {};
    app.loading( '加载中...' );
    app.send('queryCurrentTrain', { applyId: options.applyId, date: options.date || Util.formatTime(Date.now(), 'yyyy-MM-dd') }, 'get', {
      'x-rjft-request': 'native',
      'Authorization': `Bearer ${app.globalData.token}`
    }).then(res=>{
      app.loading();
      wx.stopPullDownRefresh();
      var networkType = res.net.networkType;
      networkType != 'none' && this.loadPlanlist();
      if( (res.data||{}).retcode == 200 ){
        var data = res.data.object||{};
        this.setData({
          applyId: options.applyId,
          networkType:'',
          day:data.day,
          typeStr:data.type,
          userNameTips: tipsMap[data.type]+data.userName,
          level: data.level||'',
          motionNum: data.motionNum||'',
          duration: data.duration||'',
          consume: data.consume,
          hasVideo: (data.trainList||[]).length>0
        });
        app.globalData.planListData = data || {};//这里缓存数据给播放页面使用
        wx.setNavigationBarColor({
          frontColor:"#ffffff",
          backgroundColor: titleColorMap[data.type]
        });
      } else if (networkType=='none'){
        this.setData({
          networkType:'none'
        });
      } else if (res.data){
        app.errorLog({
          url: 'queryCurrentTrain',
          code: 40006,
          statusCode: res.statusCode,
          userId: app.globalData.userId || '',
          serverData: JSON.stringify(res.data)
        });
        app.alert((res.data.desc || '服务繁忙!')+'(40006)');
      } else {
        app.errorLog({
          url: 'queryCurrentTrain',
          code: 40008,
          statusCode: res.statusCode,
          userId: app.globalData.userId || '',
          serverData: JSON.stringify(res.data)
        });
        app.alert( '服务繁忙!(40008)' );
      }
    },err=>{
      console.log(err);
      wx.stopPullDownRefresh();
      app.loading();
      if (err.statusCode == -500){
        this.setData({
          networkType: 'none'
        });
      } else {
        app.errorLog({
          url: 'queryCurrentTrain',
          code: 40001,
          userId: app.globalData.userId || '',
          errorMsg: JSON.stringify(err).substr(0, 500)
        });
        app.alert('服务繁忙!(40001)');
      }
    });
  },
  planListCache : [],
  loadPlanlist() {
    app.send('queryModuleTrainList', null,'get', {
      'x-rjft-request': 'native',
      'Authorization': `Bearer ${app.globalData.token}`
    }).then(res=>{
      var data = res.data;
      if( data.retcode == 200 ){
        var { list, trainNum} = data.object;
        if( list.length ){
          this.planListCache = list;
          this.setData({
            hasMore: trainNum>=4,
            list,
            listWidth:list.length*430,
            bottomMod:true
          });
        }
      } else {
        app.errorLog({
          url: 'queryModuleTrainList',
          code: 'queryModuleTrainListError',
          userId: app.globalData.userId || '',
          serverData: JSON.stringify(data)
        });
      }
    },error=>{
      app.errorLog({
        url: 'queryModuleTrainList',
        code: 'queryModuleTrainListErrorMsg',
        userId: app.globalData.userId || '',
        serverData: JSON.stringify(error)
      });
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
  
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
  
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
  
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
  
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    this.onLoad( this.options );
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
  js_goplay( e ){
    var index = e.currentTarget.dataset.index;
    app.globalData.planListData_Plan = this.planListCache[index];
    app.location('/pages/plan/play/play?type=plan');
  },
  js_playDay(){
    var data = app.globalData.planListData||{};
    if (PlayCache.isEnd('day', data.key)){

      app.location(`/pages/plan/resultNew/result?motionNum=${data.motionNum}&duration=${data.duration}&consume=${data.consume}&type=day&key=${data.key}&isEnd=true`);
    } else {
      app.location('/pages/plan/play/play?type=day');
    }
    
  }
})