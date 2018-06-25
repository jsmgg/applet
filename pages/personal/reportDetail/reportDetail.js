var app = getApp();
var URLMap = require('../../../config.js');
Page({

  /**
   * 页面的初始数据
   */
  data: {
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var week = app.globalData.reportWeek
    var id = app.globalData.applyRecord.applyId
    //var srcHeader1 = app.debug ? 'https://malltest.rjfittime.com/fitcampApplet/abilityReport.html?applyId=' : 'https://mall.rjfittime.com/fitcampApplet/abilityReport.html?applyId='
    //var srcHeader2 = app.debug ? 'https://malltest.rjfittime.com/fitcampApplet/weeklyByWeek.html?applyId=' : 'https://mall.rjfittime.com/fitcampApplet/weeklyByWeek.html?applyId='
    if (!week) {
      this.setData({
        src: URLMap.H5_abilityReport.replace('{applyId}', id) + '&notBackHome=1'
      })
    } else {
      this.setData({
        src: URLMap.H5_weeklyByWeek.replace('{applyId}', id).replace('{week}', week)
      })
    }
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

  },
  js_goback() {
    app.navigateBack();
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

  }
})