var app = getApp();
var Util = require('../../../utils/util.js');
Page({

  /**
   * 页面的初始数据
   */
  data: {
    networkType:'',
    planList: [],
    today: Util.formatTime(Date.now(),'yyyy年MM月dd日')
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    //options.applyId
    this.options = options;
    app.loading('加载中...');
    app.send('queryTrainHistory', { applyId: options.applyId }, 'get', {
      'x-rjft-request': 'native',
      'Authorization': `Bearer ${app.globalData.token}`
    }).then(res=>{
      app.loading();
      wx.stopPullDownRefresh();
      var networkType = res.net.networkType;
      if ((res.data||{}).retcode == 200 ) {
        var data = res.data.object||{list:[]};
        this.setData({
          isEnd: data.isEnd,
          isJoinAdvancedCamp: data.isJoinAdvancedCamp,
          planList: this.formatData(data.list),
          applyId: options.applyId
        });
      } else{
        if (networkType=='none'){
          return this.setData({
            networkType: networkType
          });
        }
        app.alert(((res.data || {}).retdesc || '服务繁忙')+'(50003)');
        networkType != 'none' && app.errorLog({
          url: 'queryTrainHistory',
          code: 50003,
          statusCode: res.statusCode,
          userId: app.globalData.userId || '',
          serverData: JSON.stringify(res.data).substr(0, 500)
        });
      }
    },err=>{
      wx.stopPullDownRefresh();
      app.loading();
      app.errorLog({
        url: 'queryTrainHistory',
        code: 50001,
        userId: app.globalData.userId || '',
        serverData: JSON.stringify(err).substr(0, 500)
      });
      app.alert( '服务繁忙!(50001)' );
    }).catch(err=>{
      wx.stopPullDownRefresh();
      app.loading();
      app.errorLog({
        url: 'queryTrainHistory',
        code: 50002,
        userId: app.globalData.userId || '',
        serverData: JSON.stringify(err).substr(0, 500)
      });
      app.alert('服务繁忙!(50002)');
    });
  },
  formatData(data) {
    var time = app.globalData.detailPageTermData.campStartTime;
    var planList = [];
    data.forEach((item, i) => {
      let dt = { _formatDate: Util.formatTime(item.date, 'yyyy年MM月dd日') };
      dt._date = Util.formatTime(item.date, 'yyyy-MM-dd');
      dt.name = item.msg;
      dt.type = 0;//之前有休息日一说
      dt.fig = item.isTrained==1;
      planList.push(dt);
    });
    return planList;
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    this.onLoad(this.options);
  }
})