var app = getApp();
var Util = require('../../../utils/util.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    networkType:'',
    loadend:false,
    intoId:'',
    pageType:'friend',
    showRule:false,//是否能看到我的排名，能看到则因此查看我的排名按钮
    scrollHeight:400,
    myRank:true,//是否显示我的排名按钮
    dataList:[],
    userId:0,
    showStarTab: 0,//#1:显示明星榜 0:不显示明星榜,
    showStarList: 0, //#1:显示列表 0:显示排行规则,
    isShowList: 0, //1: 显示查看人气 0: 不显示查看人气,
    isOnList: 0, //1:在明星榜 0:不在明星榜,
    isUpload: 0 //#1:已上传资料 0:未上传资料,
    
  },
  canVote: 0,//是否能投票
  userId : 0,
  windowWidth:0,
  windowHeight:0,

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    app.loading( '加载中...' );
    app.getSystemInfo().then(res=>{
      this.windowWidth = res.windowWidth;
      this.windowHeight = res.windowHeight;
      this.userId = app.globalData.userId;
      this.rander(options.pageType||'friend');
    })
  },
  rander( pageType ) {
    app.send('scoreList', { type: pageType == 'friend' ? 1 : 2 }, 'post', {
      'x-rjft-request': 'native',
      'Authorization': `Bearer ${app.globalData.token}`,
      'content-type': 'application/x-www-form-urlencoded'
    }).then(res => {
      app.loading();
      if (res.data && res.data.retcode == 200) {
        this.showPage(res.data.object, pageType);
      } else {
        app.errorLog({
          url: 'scoreList',
          code: 80006,
          type: pageType,
          serverData: JSON.stringify(res)
        });
        app.alert({
          content:(res.data||{}).retdesc||'服务繁忙(80006)',
          success(confirm){
            (res.data||{}).retcode==-2 && app.navigateBack();
          }
        });
      }
    }).catch(err => {
      app.loading();
      if (err.statusCode != -500){
        app.errorLog({
          url: 'scoreList',
          code: 80005,
          serverData: JSON.stringify(err)
        });
        app.alert('服务繁忙(80005)');
      } else {
        this.setData({
          networkType:'none'
        });
      }

    })
  },
  ui_config:{
    scrollHeight: 0,
    myRank:false,
    myTop:-1,
    itemHeight:0
  },
  showPage(obj, pageType ){
    var ui_config = this.initScrollHeight(obj, pageType);
    var { showStarTab, showStarList, isShowList, isOnList, isUpload, canVote} = obj;
    this.canVote = canVote?1:0;
    console.log(['ui_config',ui_config]);
    this.ui_config = ui_config;
    var data = {
      userId: this.userId,
      scrollHeight: ui_config.scrollHeight - (ui_config.myRank ? ui_config.itemHeight:0),
      myRank: ui_config.myRank,
      networkType:'',
      loadend:true,
      dataList: obj.list,
      showStarTab,
      showStarList,
      isShowList,
      isOnList,
      isUpload,
      pageType
    }
    this.setData(data);
  },
  initScrollHeight(obj, pageType) {
    var topHeight = Util.rpx_to_px(obj.showStarTab == 1 ? 311 : 211, this.windowWidth);
    var itemHeight = Util.rpx_to_px(149, this.windowWidth);//一个排名的高度
    var scrollHeight = this.windowHeight - topHeight;
    var myIndex = -1;
    var myTop = -1;
    var myRank = false;
    (obj.list||[]).forEach((item,i)=>{
      if( item.userId == this.userId ){
        myIndex = i;
      }
    });
    if( myIndex != -1 ){
      myTop = (myIndex + 1) * itemHeight + Util.rpx_to_px(20, this.windowWidth);;
    }
    if(myTop >= scrollHeight){
      //scrollHeight -= itemHeight;
      myRank = true;
    }
    
    return {
      myRank,
      scrollHeight,
      myTop,
      itemHeight
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
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
  
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
  
  },
  js_myrank() {
    this.setData({
      intoId:'item_'+this.userId
    })
  },
  js_changeNav( e ){//切换排行版
    var type = e.currentTarget.dataset.type;
    if(this.data.pageType == type) return;
    var data = {
      pageType: type,
      myRank : false
    };
    if( type == 'star' ){
      data.intoId = '';
    }
    this.setData( data );
    app.loading('加载中...');
    this.rander(type);
  },
  js_showRule(){
    this.setData({
      showRule:true
    })
  },
  js_hideRule( e ){
    if (e.target.id =='js_hideRule'){
      this.setData({
        showRule: false
      })
    }
  },
  js_starList(){
    if (this.canVote==1){
      app.location('/pages/personal/rankH5/starList/starList?applyId=' + app.globalData.applyRecord.applyId)
    } else {
      app.alert('活动还没有开始，明天再来看看吧～');
    }
  },
  js_scroll( e ) {
    if (this.data.pageType == 'star' || this.ui_config.myTop==-1)return;
    let myRank = false;
    let scrollTop = e.detail.scrollTop;
    let { myTop, scrollHeight, itemHeight} = this.ui_config;
    if (scrollTop > myTop - itemHeight){
      myRank = true;
    }
    if (scrollTop < myTop - scrollHeight) {
      myRank = true;
    }
    //console.log({ scrollTop, myTop, scrollHeight});
    this.setData({ myRank});
  }
})