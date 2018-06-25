var app = getApp();
var Util = require('../../../utils/util.js');

var PointMap = [];

Page({

  /**
   * 页面的初始数据
   */
  data: {
    current: 0,
    scrollLeft: 0,
    scrollTop: 0,
    height: '1090rpx',
    imgHeight: '9467rpx',
    taps: [],
    navWidth: '170rpx',
    tapsWidth: '1360rpx',
    windowHeight: 603,
    windowWidth: 375,
    src: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    PointMap = [
      {
        dataArray: [0, 1435, 3152, 3745, 4347, 4957, 5546, 6125],
        taps: ['主食', '蛋白质', '蔬菜', '坚果', '调料', '水类', '水果', '奶类'],
        imgHeight: 9467,
        src: app.globalData.config.cdnHost + 'FmsugJ3O0091SqET-ACpSXnSy07v'
      },
      {
        dataArray: [0, 1435, 3152, 3745, 4355, 4947, 5540, 6122],
        taps: ['主食', '蛋白质', '蔬菜', '坚果', '调料', '水类', '水果', '奶类'],
        imgHeight: 9494,
        src: app.globalData.config.cdnHost + 'FuDkfqzCQZuwzMRennW9aSfi3kMZ'
      },
      {
        dataArray: [0, 1424, 2768, 3362, 3966, 4558, 5152],
        taps: ['主食', '蛋白质', '蔬菜', '坚果', '调料', '水类', '水果'],
        imgHeight: 8583,
        src: app.globalData.config.cdnHost + 'Fg1UCuvC2IQ7dSquq2lizxe1WTQa'
      }
    ];//type  0: 非素食  1: 蛋奶素   2: 纯素
    var current = parseInt(options.current) || 0;
    var type = parseInt(options.type) || 0
    app.getSystemInfo().then((res) => {
      //console.log(res);
      let { dataArray, imgHeight, src, taps } = PointMap[type];
      this.dataArray = dataArray.map((n) => {
        return Util.rpx_to_px(n, res.windowWidth);
      });
      this.setData({
        current: current,
        src: src,
        taps: taps,
        tapsWidth: Util.rpx_to_px(parseInt(this.data.navWidth) * dataArray.length, res.windowWidth) + 'px',
        scrollTop: this.dataArray[current],
        height: (res.windowHeight - Util.rpx_to_px(115, res.windowWidth)) + 'px',
        navWidth: Util.rpx_to_px(parseInt(this.data.navWidth), res.windowWidth) + 'px',
        windowHeight: res.windowHeight,
        windowWidth: res.windowWidth,
        imgHeight: Util.rpx_to_px(parseInt(imgHeight), res.windowWidth) + 'px'
      })
    });
    if (options.dietLevel) {
      wx.setNavigationBarTitle({ title: `食谱Lv.${options.dietLevel}` });
    }
  },
  dataArray: [],//rpx
  aniBusy: false,
  timer: null,
  js_change(e) {
    var current = parseInt(e.currentTarget.dataset.current);
    if (this.data.current == current) return;
    this.setData({
      current: current,
      scrollTop: this.dataArray[current]
    });
    clearTimeout(this.timer);
    this.aniBusy = true;
    this.timer = setTimeout(() => {
      this.aniBusy = false;
    }, 600);
  },
  time1: null,
  time2: null,
  js_setScrollLeft(e) {
    clearTimeout(this.time1);
    this.time1 = setTimeout(() => {
      this.setData({
        scrollLeft: e.detail.scrollLeft
      })
    }, 100);
  },
  js_setScrollTop(e) {
    if (this.aniBusy) return;
    clearTimeout(this.time2);
    this.time2 = setTimeout(() => {
      var scrollTop = e.detail.scrollTop;
      var current = this.data.current;
      this.dataArray.forEach((n, i) => {
        n |= 0;
        if (n <= scrollTop) {
          current = i;
        }
      });
      var scrollLeft = this.data.scrollLeft;
      var minLeft = Math.max((current + 1) * parseInt(this.data.navWidth) - this.data.windowWidth, 0);
      var maxLeft = current * parseInt(this.data.navWidth);
      scrollLeft = Math.min(maxLeft, Math.max(minLeft, scrollLeft));
      this.setData({
        current: current,
        //scrollTop: scrollTop|0,
        scrollLeft: scrollLeft | 0
      });
    }, 100);

  }
})