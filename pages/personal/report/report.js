// pages/personal/report/report.js
var app = getApp();
Page({

  /**
   * 页面的初始数据
   */
  data: {
    loadEnd: false,
    reportList: [1,2,3],
    stage: ''
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
    this.getDetail()
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
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
    app.loading('加载中...');
    var typeNum = app.globalData.detailPageTermData.type
    this.setData({
      stage: app.globalData.detailPageTermData.termName
    })
    var params = {
      applyId: app.globalData.applyRecord.applyId
    }
    app.send('reportList', params, 'get', {
      'x-rjft-request': 'native',
      'Authorization': `Bearer ${app.globalData.token}`,
      'content-type': 'application/x-www-form-urlencoded'
    }).then(res => {
      app.loading();
      // console.log(res)
      if (res.data && res.data.retcode === 200) {
        let myList = res.data.list
        for (var i = 0; i < myList.length; i++) {
          myList[i].statusName = this.return_week(myList[i].week, typeNum)
        }
        this.setData({
          reportList: myList,
          loadEnd: true
        });
      } else {
        res.statusCode != -500 && app.errorLog({
          url: 'reportList',
          code: 84001,
          serverData: JSON.stringify(res)
        });
        app.alert(res.statusCode == -500 ? '请检查网络！' : '服务繁忙!(84001)');
      }
    }).catch(err => {
      res.statusCode != -500 && app.errorLog({
        url: 'reportList',
        code: 84002,
        serverData: JSON.stringify(err)
      });
      app.loading();
      app.alert(err.statusCode == -500 ? '请检查网络！' : '服务繁忙!(84002)');
    })
  },
  js_datail(event) {
    app.globalData.reportWeek = event.currentTarget.dataset.week;
    app.location('/pages/personal/reportDetail/reportDetail');
    // 查看报告时，清除上次刷新时间，这样回到首页时实时刷新红点
    app.setStorage({ key: app.appletRefreshTime, data: 1 });
  },
  return_week(week,typeNum) {
    if (!week) {
      return '开营'
    } else if ((typeNum === 1 && week === 4) || (typeNum === 5 && week === 8) ) {
      return '结营'
    } else {
      return 'W' + week
    }
  }
})