// list.js
var app = getApp();
Page({

  /**
   * 页面的初始数据
   */
  data: {
    networkType:'',
    addLast:false
  },
  planListCache:[],
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.options = options;
    app.globalData.uploadVideoCache = {};
    app.loading('加载中...');
    app.send('queryModuleTrainList', { type: 'more' }, 'get', {
      'x-rjft-request': 'native',
      'Authorization': `Bearer ${app.globalData.token}`
    }).then(res=>{
      app.loading();
      wx.stopPullDownRefresh();
      var networkType = res.net.networkType;
      if ((res.data||{}).retcode == 200 ) {
        this.planListCache = res.data.object.list;
        this.setData({
          list: res.data.object.list,
          addLast: res.data.object.list.length%2==1
        })
      } else {
        if (networkType=='none'){
          return this.setData({
            networkType: networkType
          });
        } else {
          app.errorLog({
            url: 'queryModuleTrainList',
            code: 70001,
            userId: app.globalData.userId || '',
            serverData: JSON.stringify(res.data)
          });
          app.alert((res.data.retdesc || '服务繁忙')+'(70001)');
        }
      }
    },err=>{
      wx.stopPullDownRefresh();
      app.loading();
      app.errorLog({
        url: 'queryModuleTrainList',
        code: 70002,
        userId: app.globalData.userId || '',
        serverData: JSON.stringify(err)
      });
      app.alert('请求失败70002');
    }).catch(err=>{
      wx.stopPullDownRefresh();
      app.loading();
      app.errorLog({
        url: 'queryModuleTrainList',
        code: 70003,
        userId: app.globalData.userId || '',
        serverData: JSON.stringify(err)
      });
      app.alert('请求失败70003');
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
    this.onLoad(this.options);
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
  js_goplay(e) {
    var index = e.currentTarget.dataset.index;
    app.globalData.planListData_Plan = this.planListCache[index];
    app.location('/pages/plan/play/play?type=plan');
  }
})