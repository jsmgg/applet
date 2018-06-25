var app = getApp();
var Util = require('../../../utils/util.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    list : [],
    current : 0,
    oneDay : false,
    scrollHeight: '1093rpx;',
    loadend:0,
    type: 0,  //type  0: 非素食  1: 蛋奶素   2: 纯素,
    dkBtnText:'',
    candk : 0,
    netError:0
  },
  data_map: { breakfast: 0, lunch: 1, dinner: 2, snack:3},
  options:{},
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad( options ) {
    var oneDay = (options.action||'_') in this.data_map;
    this.options = options;
    app.loading( '加载中...' );
    app.getSystemInfo().then(( div )=>{
      app.send('userDiet', {}, 'get', {
        'x-rjft-request': 'native',
        'Authorization': `Bearer ${app.globalData.token}`
      }).then((res) => {
        app.loading();
        wx.stopPullDownRefresh();
        var data = res.data;
        if (data.retcode == 200 && data.object) {
          var pageData = this.formatData(data.object, div);
          pageData.netError = 0;
          if( oneDay ){
            pageData.oneDay = oneDay;
            pageData.current = this.data_map[options.action] || 0;
            pageData.item = pageData.list[pageData.current];
            pageData.scrollHeight = div.windowHeight+'px';
            pageData.dkBtnText = ['早餐打卡', '午餐打卡', '晚餐打卡', '加餐打卡'][pageData.current];
            pageData.candk = options.candk;
          }
          if ( options.dietLevel ) {
            wx.setNavigationBarTitle({ title: `食谱Lv.${options.dietLevel}` });
            pageData.dietLevel = options.dietLevel;
          }
          this.setData(pageData);
        } else {
          app.errorLog({
            url:'userDiet',
            code:'dietListPage',
            serverData:JSON.stringify( res )
          })
          app.alert(data.retdesc || '数据加载失败!');
        }
      }).catch((res) => {
        app.loading();
        wx.stopPullDownRefresh();
        if( res.statusCode == -500 ){
          this.setData({ netError : 1, loadend:1});
        }else {
          app.errorLog({
            url: 'userDiet',
            code: '10000',
            serverData: JSON.stringify(res)
          })
          app.alert('服务器繁忙(10000)');
        }
      });
    });
  },
  onPullDownRefresh() {
    this.onLoad( this.options );
  },
  onReachBottom(){},
  formatData( object , div ){
    var current = this.data_map[object.current]||0;
    var type = parseInt(object.type)||0;
    var list = [
      object.breakfast||[],
      object.lunch||[],
      object.dinner || [],
      object.snack || []
    ];
    var scrollHeight = (div.windowHeight - Util.rpx_to_px(115, div.windowWidth))+'px';
    var loadend = true;
    return { current, list, scrollHeight, type, loadend};
  },
  dietSwiperChange( e ) {
    this.setData({
      current: e.detail.current
    })
  },
  js_reload() {
    this.onPullDownRefresh();
  },
  js_change( e ) {
    this.setData({
      current: parseInt(e.currentTarget.dataset.index)||0
    });
  }
})