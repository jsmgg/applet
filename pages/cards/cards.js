var app = getApp();
var Util = require('../../utils/util.js');
var tmpData = [{
  status: 0,
  type: 'werun',
  title: '脂肪回收站'
},{
  status: 0,
  type: 'breakfast',
  title: '能量早餐'
}, {
  status: 0,
  type: 'lunch',
  title: '活力午餐'
  }, {
    status: 0,
    type: 'dinner',
    title: '营养晚餐'
  }, /*{
  status: 0,
  type: 'snack',
  title: '健康加餐'
  },*/ {
    status: 0,
    type: 'training',
    title: '科学运动'
  }, {
    status: 0,
    type: 'bodydata',
    title: '身体围度测试'
  }];
var scoreMap={
  breakfast:5,
  lunch:5,
  dinner:5,
  training:10,
  bodydata:15
};


Page({

  /**
   * 页面的初始数据
   */
  data: {
    loadend:0,
    list:[],
    netError:0,
    typeScore:0,
    aniStyle:''
  },
  werun:false,//运动授权
  options : {},
  typeMap:{},
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.options = options;
    app.debug && console.log(['options',options]);
    app.loading('加载中...');
    app.getSetting().then(setting=>{
      console.log(['授权接口：', setting]);
      this.werun = setting['scope.werun'];
      if ( this.werun ){
        this.getWeRunData(runNumber=>{
          this.load(runNumber);
        });
      } else {
        this.load();
      }
    })
  },
  load(runNumber){
    var options = this.options;
    app.send('checkinRecords', {
      date: Util.formatTime(Date.now(), 'yyyy-MM-dd'),
      applyId: options.applyId,
      'timezone': (new Date()).getTimezoneOffset()
    }, 'get').then(res => {
      app.loading();
      var typeMap = {};
      if (res.data.retcode == 200) {
        var obj = res.data.list || [];
        obj.forEach(item => {
          var key = item.type.toLocaleLowerCase();
          typeMap[key] = item;
        });
        var list = this.getList(typeMap, runNumber);
        this.setData({
          list: list,
          netError: 0,
          loadend: 1,
          aniStyle:''
        });
      } else {
        app.errorLog({
          url: 'checkinRecords',
          code: 'cardsPage',
          serverData: JSON.stringify(res)
        });
        app.alert(res.data.desc || '数据刷新失败');
      }
      this.typeMap = typeMap;
    }).catch(err => {
      app.loading();
      if (err.statusCode == -500) {
        this.setData({ netError: 1, loadend: 1 });
      } else {
        app.errorLog({
          url: 'checkinRecords',
          code: 'cardsPageCatch',
          serverData: JSON.stringify(err)
        });
        app.alert('服务异常');
      }
    });
  },
  getList(typeMap, runNumber) {
    var arr=[],over = [];
    tmpData.forEach( item => {
      if (this.options.courseId!=1 && item.type =='training'){
        return;
      }
      if (item.type == 'werun' && !this.werun){//未授权
        item.status = 1;
        return arr.unshift(item);
      } else if (item.type == 'werun'){
        if (typeMap[item.type]) {
          item.status = typeMap[item.type].state == 1 ? 3 : 2;
        } else {
          item.status = 2;
        }
        if (runNumber !== undefined) {
          item.runNumber = runNumber;
          item.score = this.getScoreByRun(runNumber);
          this.runScore = item.score;
          console.log(['::::::', this.runScore])
        }
        return item.status==3?over.push(item):arr.push(item);
      }

      if (typeMap[item.type]) {
        item.status = typeMap[item.type].state==1?3:2;
        item.status==3?over.push(item):arr.push(item);
      } else {
        item.status = 1;
        arr.push( item );
      }
    });
    return arr.concat(over);
  },
  getScoreByRun(runNumber){
    runNumber = runNumber||0;
    if (runNumber<5000){
      return 1;
    }
    if (runNumber >= 5000 && runNumber < 10000){
      return 2;
    }
    if (runNumber >= 10000 && runNumber < 20000) {
      return 5;
    }
    return 10;
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    var fig = app.getStorage(app.dkListUpdate, true);
    if (fig) {
      this.onPullDownRefresh();
      //app.removeStorage({ key: app.dkListUpdate }, true);
    }
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
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },
  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
  
  },
  getStatus( type ){
    var status = 1;
    this.data.list.forEach(( item )=>{
      if( item.type == type ){
        status = item.status;
      }
    })
    return status;
  },
  js_reload() {
    this.onPullDownRefresh();
  },
  runScore:0,
  alowWerun(){//授权运动
    app.loading('加载中...');
    this.getWeRunData(runNumber=>{
      app.loading();
      if (runNumber=== undefined) {
        return;
      }
      var list = [];
      this.data.list.forEach((item) => {
        if (item.type == 'werun') {
          if (this.typeMap[item.type]) {
            item.status = this.typeMap[item.type].state == 1 ? 3 : 2;
          } else {
            item.status = 2;
          }
          item.runNumber = runNumber;
          item.score = this.getScoreByRun(runNumber);
          this.runScore = item.score;
          console.log(['::::::', this.runScore])
        }
        list.push( item );
      });
      this.setData({
        list
      })
    })

  },
  getWeRunData( cb, hasAllowedWeRun ){
    app.wxLogin().then(loginData => {
      console.log(loginData);
      if (!loginData.code){
        app.loading();
        app.alert('获取用户登录态失败！');
      }
      app.getWeRunData().then(dt => {
        if (dt.iv) {
          var data = {
            weRunIV: dt.iv,
            weRunData: dt.encryptedData,
            wxappSessionCode: loginData.code,
            'timezone': (new Date()).getTimezoneOffset()
          };
          this.werun = true;
          app.send('wechatStep', data, 'post', {
            'x-rjft-request': 'native',
            'Authorization': `Bearer ${app.globalData.token}`,
            'content-type': 'application/x-www-form-urlencoded'
          }).then(res => {
            if (res.data && res.data.retcode==200) {
              let runNumber = res.data.object||0;
              cb(runNumber);
            } else {
              app.loading();
              app.errorLog({
                url: 'wechatStep',
                page: 'cards/cards',
                code: '80008',
                serverData: JSON.stringify(res)
              });
              app.alert( '服务繁忙(80008)' );
            }
          }).catch(err => {
            app.loading();
            app.errorLog({
              url: 'wechatStep',
              page: 'cards/cards',
              code: '80007',
              serverData: JSON.stringify(err)
            })
            app.alert('服务繁忙(80007)');
          });
        } else {
          if (hasAllowedWeRun) {
            this.werun = false;
            cb();
            return;
          }

          app.loading();
          app.errorLog({
            url: 'getWeRunData',
            page: 'cards/cards',
            code: 'getWeRunDataFail',
            serverData: JSON.stringify(dt)
          })
          app.confirm({
            content:'去授权“允许-微信运动步数”，可领取积分哦～',
            confirmText:'去授权'
          }).then(res=>{
            if (res.confirm) {
              app.openSetting().then(res => {
                app.errorLog({
                  url: 'OpenSetting',
                  page: 'cards/cards',
                  serverData: JSON.stringify(res)
                });
                if (res && res.authSetting && res.authSetting['scope.werun']) {
                  app.loading('加载中...');
                  this.getWeRunData(cb, true);
                }
              });
            } else {
              this.werun = false;
              cb();
            }
          });
        }
      });
    })
  },
  dkclick: false,
  js_showdk_view(e) {//"breakfast", "lunch", "dinner", "snack", "training"
    if (this.dkclick) return;
    let type = e.currentTarget.dataset.type;
    let status = this.getStatus(type);
    if (type =='werun'){
      if( status == 1 ){
        this.alowWerun();
      } else if( status == 2 ){
        this.getScore(type);
      }
      return;
    }
    let candk = status==1?1:0;

    if (type == 'training') {
      app.location('/pages/plan/index/index?applyId=' + this.options.applyId);
    } else if (type == 'bodydata') {
      app.location('/pages/personal/test/test');
    } else {
      app.location(`/pages/diet/list/list?action=${type}&dietLevel=${this.options.dietLevel}&candk=${candk}`);
    }
  },
  js_dk(e) {
    let type = e.currentTarget.dataset.type;
    let status = this.getStatus(type);
    if (type == 'werun') {//这个不做区分
      return;
    }
    this.dkclick = true;
    setTimeout(() => {
      this.dkclick = false;
    }, 500);
    if (type == 'bodydata' && (status == 1 || status == 3)){
      // 点击"录入维度"时，清除上次刷新时间，这样回到首页时实时刷新红点
      status === 1 && app.setStorage({ key: app.appletRefreshTime, data: 1 });
      return app.location('/pages/personal/test/test');
    }
    if (status == 2) {
      return this.getScore(type);
    } else if (status==3 ) {
      wx.previewImage && wx.previewImage({
        urls: [this.typeMap[type].imageUrl]
      });
    }else {
      this.location(type);
    }
  },
  location(type) {
    if (type === 'training') { // 如果是运动打卡
      app.location(`/pages/recordNew/train/edit/edit`);
    } else { // 否则就是饮食打卡
      app.location(`/pages/recordNew/food/edit/edit?type=${type}`);
    }
  },
  getScore( type ) {
    app.loading( '加载中...' );
    app.send('exchangeScore',{
      timezone: (new Date()).getTimezoneOffset(),
      type: type.toUpperCase()
    }, 'post',{
      'x-rjft-request': 'native',
      'Authorization': `Bearer ${app.globalData.token}`,
      'content-type': 'application/x-www-form-urlencoded'
    }).then(res=>{
      app.loading();
      if( res.data && res.data.retcode == 200 ){
        var list=[];
        this.data.list.forEach(( item )=>{
          if( item.type == type ){
            item.status = 3;
          }
          list.push(item);
        });
        var typeScore = scoreMap[type];
        typeScore = typeScore || this.runScore;

        this.setData({ list, typeScore, aniStyle: type + 'Ani'});
        //更新本地打卡记录
        app.setStorage({
          key: app.dkListUpdate,
          data: 1
        }, true);
      } else {
        app.alert((res.data || {}).retdesc ||'领取积分失败!(80010)');
        app.errorLog({
          url: 'exchangeScore',
          code: 80010,
          serverData: JSON.stringify(res)
        });
      }
    }).catch(err=>{
      app.loading();
      console.log(err);
      app.errorLog({
        url:'exchangeScore',
        code:80009,
        serverData:JSON.stringify( err )
      });
      app.alert( '服务繁忙(80009)' );
    })
  }
})