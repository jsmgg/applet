// pages/personal/index/index.js
var app = getApp();
Page({

  /**
   * 页面的初始数据
   */
  data: {
    loadEnd:false,
    name:'',
    avatar:'',
    checkinCount:'0',//总打卡次数
    streakDayOneCount:'0',//连续打卡天数
    sportNum:'--',
    unRead: 1 // 是否有未读消息，默认没有
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.getDetail()
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
    this.getDetail()
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
    this.getDetail();
    setTimeout(()=>{
      wx.stopPullDownRefresh();
    },1000);
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
  getDetail() {
    app.wxLogin().then(loginData => {
      if (!loginData.code) return app.alert('获取用户登录态失败！');
      app.loading('加载中...');
      app.getWeRunData().then(dt => {//取消授权：errMsg: "getWeRunData:fail auth deny"
        var params = dt.iv ? { weRunIV: dt.iv, weRunData: dt.encryptedData, client: 'fitcamp' } : { client: 'fitcamp' };
        Object.assign(params, {
          client: 'fitcamp',
          wxappSessionCode: loginData.code
        });
        //return console.log(JSON.stringify(params));
        app.send('checkinStatus', params, 'post', {
          'x-rjft-request': 'native',
          'Authorization': `Bearer ${app.globalData.token}`,
          'content-type': 'application/x-www-form-urlencoded'
        }).then(res => {
          app.loading();
          if (res.data && res.data.object) {
            let { name, avatar, checkinCount, streakDayOneCount, weRunData, showTarget, unRead } = res.data.object;
            //console.log( res );
            this.setData({
              name: name || '',
              avatar: avatar || '',
              checkinCount: checkinCount || 0,
              streakDayOneCount: streakDayOneCount || 0,
              sportNum: (weRunData && weRunData.stepInfoList.length) ? weRunData.stepInfoList[weRunData.stepInfoList.length - 1].step : '--',
              loadEnd: true,
              showTarget,
              unRead: unRead
            });
          } else {
            res.statusCode != -500 && app.errorLog({
              url: 'checkinStatus',
              code: 40001,
              serverData: JSON.stringify(res)
            });
            app.alert(res.statusCode == -500 ? '请检查网络！' : '服务繁忙!(40001)');
          }
        }).catch(err => {
          res.statusCode != -500 && app.errorLog({
            url: 'checkinStatus',
            code: 40002,
            serverData: JSON.stringify(err)
          });
          app.loading();
          app.alert(err.statusCode == -500 ? '请检查网络！' : '服务繁忙!(40002)');
        })
      });
    });
  },
  js_rank(){
    app.location('/pages/personal/rank/rank')
  },
  js_target() {
    app.location('/pages/personal/report/report');
  }
})