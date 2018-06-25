//获取应用实例
var app = getApp();
var countryList = require('../../utils/countryList.js');
Page({
  data: {
    codeMsg: '获取验证码',
    mobile : '',
    country : '中国',
    areaCode : '+86',
    code : '',
    showCountryList : false,
    countryList: countryList,
    showConfirm:false
  },
  action: 'register',//register、bind 、merge
  forceMigrate:0,
  mobile:'',//记录点击获取验证码成功时候的手机号
  onLoad( params ) {
    this.action = params.action || 'register';
    this.forceMigrate = params.forceMigrate?1:0;
    //console.log(params);
  },
  bindTelInput(e) {
    this.setData({
      mobile: e.detail.value
    });
  },
  bindCodeInput(e) {
    this.setData({
      code: e.detail.value
    });
  },
  codeBusy : false,
  token : null,
  /*
    获取验证码
  */
  getCode() {
    if( this.codeBusy ) return;
    if (this.data.mobile.length == 0) return app.alert( '请输入手机号码' );
    this.codeBusy = true;
    let num = 60;
    this.setData({ codeMsg: num + 's' });
    let timer = setInterval(() => {
      num--;
      if( num == 0 ) {
        this.setData( {codeMsg:'重复发送'} );
        clearInterval(timer);
        this.codeBusy = false;
      } else {
        this.setData( {codeMsg:num+'s'} );
      }
    },1000);
    app.send('requestVerifyCode', {
      phone: this.data.mobile,
      zone: this.data.areaCode
    }).then(res => {
      if ( res.statusCode == 200 && res.data.token ) {
        this.token = res.data.token;
        this.mobile = this.data.mobile;
      } else {
        app.alert({ 400: '手机号码输入有误!' }[res.statusCode]||'获取验证码失败!');
        this.setData({ codeMsg: '获取验证码' });
        clearInterval(timer);
        this.codeBusy = false;
      }
    }).catch( error => {
      app.errorLog({
        url:'requestVerifyCode',
        code:'20001',
        serverData:JSON.stringify(error)
      });
      this.setData({ codeMsg: '获取验证码失败(20001)' });
      clearInterval(timer);
      this.codeBusy = false;
    });
  },
  submit() {
    var msg = '';
    var globalData = app.globalData;
    if( this.submitBusy ) return;
    if( this.data.mobile.length == 0 ){
      msg = '请输入手机号码';
    } else if( this.data.code.length == 0 ) {
      msg = '请输入验证码';
    }
    if( msg ){
      return app.alert( msg );
    }
    app.loading( '加载中...' );
    if (this.action == 'merge') {
      return this.cb_merge(!!this.forceMigrate);
    } else if (this.action == 'register') {
      return this.cb_register();
    }
  },
  cb_bind(dt, data){//暂时没有用到该分支
    app.send('bindPhoneUrl', {
      code: this.data.code,
      token: this.token
    }, '', {
      Authorization: `Bearer ${app.globalData.token}`
    }).then(res => {
      if (res.data.statusCode == 0) {
        app.locationReplace('/pages/index/index');
      } else {
        app.loading();
        app.alert('手机号已经绑定到其他账户');
      }
    }).catch(error => {
      app.loading();
      app.alert('服务器繁忙(20002)');
    });
  },
  cb_register(fig){
    app.wxLogin().then(dt => {
      if(!dt.code ){
        app.loading();
        app.errorLog({
          url: 'wxLogin',
          page: 'bindMobile',
          serverData: JSON.stringify(dt)
        })
        app.alert('微信登录失败！');
        return;
      }
      app.getUserInfo(data => {
        var params = {
          code: dt.code,
          encryptedData: data.encryptedData,
          iv: data.iv,
          deviceType: data.deviceType,
          deviceID: data.deviceID,
          clientVersion: data.clientVersion,
          authCode: this.data.code,
          authToken: this.token
        };
        fig && (params.forceSignUp=1);
        app.send('registerUrl', params).then(res => {
          app.loading();
          //console.log(res);
          if (res.statusCode == 200) {
            if (fig) {
              app.locationReplace('/pages/index/index?forceMigrate=1&mobile=' + this.mobile);
            } else {
              app.locationReplace('/pages/index/index');
            }
          } else if (res.statusCode == 409 && app.globalData.config.allowPhoneChange) {
            this.setData({
              showConfirm: true
            })
          } else {
            var msg = { 403: '验证码错误！', 409: '这个微信或手机号已经创建过帐号' };
            app.alert(msg[res.statusCode] || `绑定失败!(${res.statusCode})`);
          }
        }).catch(error => {
          app.loading();
          app.errorLog({
            url: 'registerUrl',
            code: 'registerUrlError',
            serverData: JSON.stringify(error)
          })
          app.loading();
          app.alert('服务器繁忙(20003)');
        });
      });
    })
  },
  cb_merge( fig ){
    var params = {
      phoneAuthCode: this.data.code,
      phoneAuthToken: this.token,
      bearerToken: app.globalData.token
    };
    fig && (params.forceMigrate = 1);
    app.send('mergeAcount', params ,null,{
        'content-type':'application/x-www-form-urlencoded'
    }).then(res=>{
      app.loading();
      if (res.data.retcode== 200 ) {
        if (fig) {
          app.locationReplace('/pages/index/index?forceMigrate=1&mobile=' + this.mobile);
        } else {
          app.locationReplace('/pages/index/index');
        }
        
      } else if (res.data.retcode == 409 && app.globalData.config.allowPhoneChange) {
        this.setData({
          showConfirm:true
        })
      } else {
        app.errorLog({
          url: 'mergeAcount',
          code:'mergeAcountFail',
          page: 'bindMobile',
          serverData: JSON.stringify(res)
        })
        app.alert(res.data.retdesc||'绑定失败!');
      }
    }).catch(err=>{
      app.errorLog({
        url:'mergeAcount',
        page:'bindMobile',
        serverData:JSON.stringify(err)
      })
    });
  },
  js_confirm_ok() {
    this.js_confirm_close();
    app.loading('加载中...');
    if( this.action=='register'){
      this.cb_register(1);
    } else {
      this.cb_merge(1);
    }
    
  },
  js_confirm_close() {
    this.setData({
      showConfirm: false
    })
  },
  showCountryList() {
    this.setData({
      showCountryList: true
    })
  },
  selectCountry( e ) {
    this.setData({
      showCountryList : false,
      country: e.target.dataset.country,
      areaCode: e.target.dataset.code
    })
  },
  closeCountry() {
    this.setData({ showCountryList:false })
  }
})
