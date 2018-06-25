//index.js
//获取应用实例
var app = getApp();
var Util = require('../../utils/util.js');
var localDataKey = app.localDataKey;
module.exports = {
  //事件处理函数
  initPage(){},
  params : {},
  userId:'',
  load( params , initPage ) {
    this.initPage = initPage || function () { };
    var jzyUserToken = app.getStorage(localDataKey, true);
    this.params = params;
    app.loading( '加载中...' );
    this.getAppletStatus(jzyUserToken, (bearerToken,testUser)=>{
      if ( testUser && testUser.userId && testUser.token ) {
        app.globalData.token = testUser.token;
        this.userId = testUser.userId;
        app.globalData.userId = this.userId;
        this.loadJZY(testUser.userId);
        app.errorLog({
          url:'testUserLogin'
        });
        return;
      }
      if (bearerToken && params.forceMigrate!=1){//有有效的token
        app.globalData.token = jzyUserToken.token;
        this.userId = (jzyUserToken||{}).userID;
        app.globalData.userId = this.userId;
        this.loadJZY(jzyUserToken.userID);
      } else {
        this.userId = (jzyUserToken || {}).userID;
        app.globalData.userId = this.userId;
        this.loginWx();
      }
    });
  },
  getAppletStatus( jzyUserToken, cb ){
    var params = { protocolVersion: app.globalData.config.clientVersion };
    if (jzyUserToken){
      params.checkBearerToken = jzyUserToken.token;
    }
    app.send('config', params,'get').then(res=>{
      let { bearerToken, uploadConfig, cdnHost, qiniuHost, aliyunOssCdnHost, aliyunOssCdnOriginalHost,allowPhoneChange,userId,token} = res.data||{};
      app.globalData.config.bearerToken = bearerToken;
      uploadConfig && (app.globalData.config.uploadConfig = uploadConfig);
      cdnHost && (app.globalData.config.cdnHost = cdnHost);
      qiniuHost && (app.globalData.config.qiniuHost = qiniuHost);
      aliyunOssCdnHost && (app.globalData.config.aliyunOssCdnHost = aliyunOssCdnHost);
      aliyunOssCdnOriginalHost && (app.globalData.config.aliyunOssCdnOriginalHost = aliyunOssCdnOriginalHost);
      app.globalData.config.allowPhoneChange = !!allowPhoneChange;
      console.log(['app.globalData.config', app.globalData.config]);


      if (userId && token) {
        cb(null, { userId ,token});
      } else {
        cb(bearerToken);
      }


    }).catch(err=>{
      app.errorLog({
        url: 'config',
        userId: (jzyUserToken || {}).userID || '',
        serverData: JSON.stringify(err)
      });
      cb();
    });
  },
  loginWx() {
    app.wxLogin().then(dt => {
      //console.log(dt);
      if (!dt.code) {
        //wx.stopPullDownRefresh();
        app.loading();
        return app.alert('获取用户登录态失败！');
      }
      app.getUserInfo(data => {
        //wx.stopPullDownRefresh();
        if (data.statusCode == -404) {
          app.loading();
          app.locationReplace('/pages/personal/allow/allow');
          return ;
        }
        //app.loading('加载中...');
        data.code = dt.code;
        this.loginApplet(data);
      })
    }).catch(err => {
      app.errorLog({
        url: 'wxLogin',
        code: 'wxLoginError',
        serverData: JSON.stringify(err)
      });
      this.initPage({ status: -1, userId: this.userId, statusCode: -500 });
      //wx.stopPullDownRefresh();
      return app.alert('登录失败!');
    });
  },
  loginApplet(data) {
    app.send('loginUrl', {
      code: data.code,
      encryptedData: data.encryptedData,
      iv: data.iv,
      deviceType: data.deviceType,
      deviceID: data.deviceID,
      clientVersion: data.clientVersion
    }).then(res => {
      //res = { statusCode: 404 };
      //res.data.userID = 123;
      //res.data.currentToken = 'ljslkdjfsdfsdf';
      this.userId = (res.data || { userID:''}).userID||'';
      app.globalData.userId = this.userId;
      if (res.statusCode == 200) {
        app.globalData.token = res.data.currentToken;
        if ( res.data.transferTarget ) {//需要合并
          this.mergeAcount( res.data );
        } else if (res.data.needMigrate) {//补充手机号
          app.locationReplace('/pages/bindMobile/bindMobile?action=merge');
        }else {
          this.saveLoginCache( res.data );//这里持久化登录状态，供下次使用
          this.loadJZY(res.data.userID);//加载用户报名减脂营信息
        }

      } else if (res.statusCode == 404) {
        app.locationReplace('/pages/bindMobile/bindMobile?action=register');
      } else {
        app.errorLog({
          url:'loginUrl',
          code:10007,
          userId: this.userId,
          serverData: JSON.stringify(res),
          statusCode: res.statusCode
        });
        this.errorHandle(10007,res);
      }
    }).catch(error => {
      app.errorLog({
        url:'loginUrl',
        code: 10001,
        userId: this.userId||'',
        serverData: JSON.stringify(error)
      });
      this.errorHandle(10001,error);
    });
  },
  saveLoginCache( data ){
    app.setStorage({
      key: localDataKey,
      data: { userID: data.userID, token: data.currentToken }
    });//这里持久化登录状态，供下次使用
  },
  mergeAcount( data ){
    app.send('transferAcount', {
      bearerToken: data.currentToken,
      unionId: data.transferTargetUnionId,
      transferTarget: data.transferTarget
    },'post',{
        'content-type':'application/x-www-form-urlencoded'
    }).then(dt => {
      if (dt.data.retcode == 200) {
        if (data.needMigrate && data.transferTargetNeedMigrate) {//补充手机号
          app.locationReplace('/pages/bindMobile/bindMobile?action=merge');
        } else {
          this.userId = data.transferTarget;
          data.userID = data.transferTarget;
          app.globalData.userId = this.userId;
          this.saveLoginCache(data);//这里持久化登录状态，供下次使用
          this.loadJZY(data.userID);//加载用户报名减脂营信息
        }

      } else {
        this.errorHandle(10010, err);
        app.errorLog({
          url: 'transferAcount',
          code: 10010,
          serverData: JSON.stringify(dt)
        });
      }
    }, err => {
      this.errorHandle(10008, err);
      app.errorLog({
        url: 'transferAcount',
        code: 10008,
        serverData: JSON.stringify(err)
      });
    }).catch(err => {
      this.errorHandle(10011, err);
      app.errorLog({
        url: 'transferAcount',
        code: 10011,
        serverData: JSON.stringify(err)
      });
    });
  },
  errorHandle(code,res ) {
    app.loading();
    res.statusCode != -500 && app.alert('不好意思呢～\n外星人又把我带走啦！\n1.你可以试着切换网络 \n2.下拉刷新\n3.删除小程序并重新搜索来找到我哦(' + code +')');
    this.initPage({ status: -1, userId: this.userId, statusCode:res.statusCode});
  },
  loadJZY( userId ) {
    let self = this;

    app.send('currentApplyUrl', {
      'date': Util.formatTime(Date.now(), 'yyyy-MM-dd'),
      'timezone':(new Date()).getTimezoneOffset()
    }, 'get', {
      'x-rjft-request': 'native',
      'Authorization': `Bearer ${app.globalData.token}`
    }).then(res => {
      //res = { statusCode:404};
      //res = { data:{retcode:-100}};
      //wx.stopPullDownRefresh();
      app.loading();
      if (res.statusCode == 200 && res.data && res.data.term && res.data.applyRecord) {//这里没有分营信息也认为是没报名
        res.data.term.campStartTime = this.cutTime(res.data.term.campStartTime);
        let {termName} = res.data.term;
        let status = 2;
        app.globalData.detailPageTermData = res.data.term;
        app.globalData.applyRecord = res.data.applyRecord;
        // 保存用户的最新体重，用处是没有搜索运动项目时也能够计算卡路里
        app.globalData.weight = res.data.weight;

        let today = this.cutTime(Date.now());
        let leftDays = Math.round((res.data.term.campStartTime - today) / (24 * 60 * 60 * 1000));
        let canBodyDataAndTest = true;
        if (res.data.term.campStartTime <= today){//服务中
          status = 3;
        } else { // 未开营
          leftDays = Math.round((res.data.term.campStartTime - today) / (24 * 60 * 60 * 1000)); // 距开营还有几天
          if (leftDays > 3) { // 超过3天，不允许填写维度和体测
            canBodyDataAndTest = false;
          }
        }

        this.initPage({
          status: status,
          term: res.data.term,
          courseId: res.data.isTest||0,//res.data.courseId||'',训练计划改版不再使用 courseId标志有没有训练计划了
          isTest : res.data.isTest||0,
          addBodyFirst : res.data.addBodyFirst||0,// 是否录入开营维度
          avatarUrl: res.data.avatarUrl||'',
          nickname : res.data.nickname||'',
          unRead: res.data.unRead||0,
          weight : self.processWeight(res.data.weight) || 0.0,
          firstWeight: res.data.firstWeight || 0,
          targetWeight: res.data.targetWeight || 0,
          termName : termName.replace('FitTime',''),
          showCard: res.data.addBodyFirst==0,
          applyRecord: res.data.applyRecord,
          checkinRecords: res.data.checkinRecords||[],
          userId: userId,
          dietLevel: res.data.dietLevel,
          checkinStatusForUser : res.data.checkinStatusForUser||{},
          canBodyDataAndTest,
          leftDays
        });
      } else if (res.statusCode == 401 ) {//登录信息失效
        app.removeStorage(localDataKey, true);
        this.load(this.params, this.initPage);
      } else if (res.statusCode == 404) {//未报名
        app.errorLog({
          url:'currentApplyUrl',
          statusCode: res.statusCode,
          userId: this.userId || '',
          serverData: JSON.stringify(res)
        });
        this.initPage({ status: 1, userId: userId});
      } else {
        app.errorLog({
          url: 'currentApplyUrl',
          code:10005,
          statusCode: res.statusCode,
          userId: this.userId || '',
          serverData: JSON.stringify(res)
        });
        this.errorHandle(10005,res);
      }
    }).catch(error => {
      console.log(error);
      app.errorLog({
        url: 'currentApplyUrl',
        code: 10003,
        userId: this.userId || '',
        serverData: JSON.stringify(error)
      });
      this.errorHandle(10003, error);
    })
  },
  cutTime( time ){
    time = parseInt(time);
    var dt = new Date( time );
    return time - dt.getHours() * 60 * 60 *1000 - dt.getMinutes() * 60 * 1000 - dt.getSeconds() * 1000;
  },
  processWeight(weight) {
    return weight ? weight.toFixed(1) : '--';
  }
}
