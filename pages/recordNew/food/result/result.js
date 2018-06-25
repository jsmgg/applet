/**********工具**********/
const app = getApp();
const utils = require('../../../../utils/util');
const checkInUtils = require('../../../../utils/checkinUtil');
const native = require('../../../../api/native');

/**********常量**********/
const PAGE_INFO = '/recordNew/food/result/result.js';
const TIPED = 'tiped';
const RECIPE_HISTORY = app.appletRecipeRecordLable;
const UNKNOWN = '未知';

Page({
  data: {
  
  },
  onLoad: function (options) {
    // 设置页面标题
    let type = options.type;
    let typeMap = {
      breakfast: "早餐打卡",
      lunch: "午餐打卡",
      dinner: "晚餐打卡"
    };
    let title = typeMap[type];
    wx.setNavigationBarTitle({title});
    this.data.type = type;

    // 设置cdn地址和打卡标题
    this.setData({
      cdnHost: app.globalData.config.cdnHost,
      typeText: title
    });

    // 取出打卡信息
    let checkInData = app.globalData.foodCheckinData;
    // 处理图片宽高
    this.adjustRecordImageShowSize(checkInData);
    // 获取用户打卡次数/天数信息
    this.checkInStatus();
    // 处理打卡内容
    this.handleCheckinRecipes(checkInData);

    this.data.checkinData = checkInData;
  },
  onShow () {
    console.log('onShow');
    console.log('generated:' + this.data.generated);
    if (this.data.generated) {
      setTimeout(() => {
        app.locationReplace('/pages/index/index');
      }, 100);
    }
  },
  adjustRecordImageShowSize (data) {
    let page = this;
    let { width, height, imgPath } = data;
    width = parseInt(width);
    height = parseInt(height);
    console.log(`width = ${width}, height = ${height}`);
    imgPath = decodeURIComponent( imgPath );
    if (!checkInUtils.isDefaultRecordImage(imgPath)) {
      // 只有用户自选图片才需要进行裁切
      let recordImgClass = 'img';
      if (width > height) {
          recordImgClass = 'img type-width';
      } else if (height > width) {
          recordImgClass = 'img type-height';
      } else if (height === width) {
        recordImgClass = 'img';
      }
      page.setData({
        recordImgClass
      });

      let downImgRetry = utils.retry(
        getImageInfo,
        function() {},
        {retryCount: 1, log: true, wait: 2000, beforeRetry: (retryCount, currentCount) => {
            imgPath = imgPath.replace(
              app.globalData.config.aliyunOssCdnHost,
              app.globalData.config.aliyunOssCdnOriginalHost);
        }});
      downImgRetry();

      console.log(`imgPath = ${imgPath}`);
      function getImageInfo(retry, currentCount){
        wx.getImageInfo({
          src: imgPath,
          success({ width, height, path }) {
            page.setData({ viewPath: path });
            if (currentCount){
              app.errorLog({
                url:'getImageInfoRetrySuccess',
                imgPath: [imgPath.replace(app.globalData.config.aliyunOssCdnHost, app.globalData.config.aliyunOssCdnOriginalHost), imgPath].join(','),
                page: PAGE_INFO
              });
            }
          },
          fail(err) {
            console.log(['----fail', err, imgPath]);
            retry();
          }
        });
      }
    } else {
      page.setData({
        viewPath: imgPath,
        recordImgClass: 'img'
      });
    }
  },
  checkInStatus () {
    let page = this;
    app.send('checkinStatus', {}, 'GET', {
      'x-rjft-request': 'native',
      'Authorization': `Bearer ${app.globalData.token}`
    }).then((res)=>{
      app.loading();
      console.log(page.data);

      let lastCheckinDate = res.data.object.lastCheckinStreakDate || 0;
      // 连续满卡天数
      let streakDayCount = res.data.object.streakDayCount ? parseInt(res.data.object.streakDayCount) : 0;
      // 连续打卡次数
      let checkinCount = res.data.object.checkinCount ? parseInt(res.data.object.checkinCount) : 0;
      let yesterday = utils.formatTime(new Date().getTime() - 24 * 60 * 60 * 1000, 'yyyy-MM-dd');
      if(lastCheckinDate === yesterday){
        streakDayCount += 1;
      } else if (lastCheckinDate < yesterday){
        streakDayCount = 1;
      }

      console.log("streakDayCount:" + streakDayCount);
      console.log("lastCheckinDate:" + lastCheckinDate);

      page.setData({
        checkinCount: ++checkinCount,
        streakDayCount
      });
    }).catch((err) => {
      app.errorLog({
        url: 'checkinStatus',
        page: PAGE_INFO,
        code: '60000',
        serverData: JSON.stringify(err)
      });
      app.alert('服务器繁忙(60000)');
    });
  },
  handleCheckinRecipes(data) {
    // 先计算总卡路里数
    let totalCalorie = 0;
    let recipeList = data.recipeList;
    // 过滤自定义食材
    let recipeListWithoutCustom = recipeList.filter((recipe) => { return !recipe.custom; });
    // 如果全是自定义食材，则显示未知，否则加和卡路里
    totalCalorie =
      recipeListWithoutCustom.length === 0 ? UNKNOWN :
      recipeListWithoutCustom.reduce((total, recipe) => {
      return total + parseFloat(recipe.current.calorie);
    }, 0);

    // 取1位小数
    if (utils.isNumber(totalCalorie)) {
      totalCalorie = this.deleteZero(totalCalorie) + '千卡';
    }

    // 然后生成食材文案列表
    let recipeTextList = recipeList.map(recipe => {
      console.log(recipe);
      let name = recipe.name + ' ';
      let text =
        recipe.count + recipe.unit.unit + '-' +
        (recipe.custom ? UNKNOWN : this.deleteZero(recipe.current.calorie) + '千卡') +
        '     ';
      return { name, text };
    });

    this.setData({
      from: data.from === 'out' ? '外食' : '自己做',
      totalCalorie,
      recipeTextList
    });
  },
  deleteZero(num) {
    num = String(num);
    if (num.indexOf('.') >= 0) {
      if (num.endsWith('.0')) return num.substring(0, num.length - 2);
      return Number(num).toFixed(1);
    }
    return num;
  },
  // 点击发送到教练群
  operateTip() {
    if (this.generating) {
      return;
    }
    this.generating = true;

    // 判断之前是否显示过提示
    if (native.getStorage(TIPED, true) + "" === "true") { // 显示过提示，则直接生成图片
      this.generateImg();
    } else { // 没显示过，则显示提示浮层
      this.setData({
        showMask: true
      });
      native.setStorage({
        key: TIPED,
        data: true
      }, true);
    }
  },
  // 生成图片
  generateImg () {
    if (this.generate) {
      return;
    }
    this.generate = true;
    app.loading({
      title: '图片生成中...',
      mask: true
    });

    this.drawImg();
  },
  drawImg () {
    let page = this;
    let checkinData = page.data.checkinData;

    let param = {
      applyId: app.globalData.applyRecord.applyId, // 报名id
      date: utils.formatTime(new Date().getTime(), 'yyyy-MM-dd'), // 客户端日期
      type: page.data.type.toUpperCase(), // 打卡类型
      originImageUrl: page.data.checkinData.imgPath, // 原图地址
      timezone: new Date().getTimezoneOffset(), // 时区,
      isFromTrainningPlan: 0, // 是否是基础训练打卡
      choose: page.from(checkinData.from), // 来源
      content: JSON.stringify(page.recipeList(checkinData.recipeList)) // 打卡内容，
    };

    /*******************以下为重试相关代码********************/
    let drawImgRetry = utils.retry(
      performDrawImg,
      errHandler,
      {retryCount: 1, log: true, wait: 2000, beforeRetry: (retryCount, currentCount) => {
        app.loading({
          title: '正在加载中...',
          mask: true
        });
      }});

    drawImgRetry();

    // 打卡
    function performDrawImg(retry) {
      app.send('checkinNew', param, 'POST', {
        "content-type": "application/x-www-form-urlencoded",
        'x-rjft-request': 'native',
        'Authorization': `Bearer ${app.globalData.token}`,
        'clientVersion': `${app.globalData.config.clientVersion}`
      }).then((res) => {
        let retcode = parseInt(res.data.retcode);

        if (retcode === 400) {
          app.loading();
          app.alert('已完成打卡');
          setTimeout(() => {
            app.locationReplace('/pages/index/index');
          }, 1000);
          return;
        } else if (retcode !== 200 || !(res.data || {}).object){
          retry(null, res);
          return;
        }

        // 打卡成功，下载并预览图片
        let imgUrl = res.data.object;
        page.downloadAndPreviewImg(imgUrl);
        app.setStorage({
          key: app.dkListUpdate,
          data: 1
        }, true);
        page.generating = false;
        page.generate = false;

        // 打卡成功以后需要食材保存在本地
        page.saveToHistory(page.format(checkinData.recipeList));

      }).catch(function (err) {
        retry(err, null);
      });
    }

    // 错误处理方法，发送错误日志，弹框提示用户错误信息
    function errHandler(err, res) {
      page.generating = false;
      page.generate = false;

      app.loading();

      let code = '83004', errMsg = `打卡失败(${code})`, serverData = err || {};
      if (res && (!res.data || !res.data.object)) {
        code = '83002';
        errMsg = (((res && res.data) || {}).retdesc || '打卡失败') + code;
        serverData = res;
      }

      app.alert(errMsg);
      app.errorLog({
        url: 'checkinNew',
        code,
        type: page.data.type.toUpperCase(),
        page: PAGE_INFO,
        userId: app.globalData.userId || '',
        serverData: JSON.stringify(serverData)
      });
    }
  },
  // 存储到本地缓存之前对数据进行格式化
  format(list) {
    let result = list.map(recipe => {
      let units = (recipe.units||[]).map(unit=>{
        let newUnit = Object.assign({},unit);
        newUnit.change = false;
        return newUnit;
      });
      let item = {
        name: recipe.name,
        calorie: recipe.custom ? UNKNOWN : recipe.calorie,
        units: units,
        custom: recipe.custom
      };

      // 如果是不是自定义食材则添加id和以克为单位的卡路里数
      if (!recipe.custom) {
        item.id = recipe.id;
        item.gramUnit = `${item.calorie}千卡/100克`;
      // 否则自定义食材的卡路里数为未知
      } else {
        item.gramUnit = UNKNOWN;
      }

      return item;
    });
    return result;
  },
  // 存储到本地缓存
  saveToHistory(list) {
    let recipeHistory = native.getStorage(RECIPE_HISTORY, true);
    if (!utils.isArray(recipeHistory)) {
      recipeHistory = [];
    }

    // 存储之前去重
    list = list.filter(item => {
      for (let j = 0; j < recipeHistory.length; j++) {
        if (item.name === recipeHistory[j].name) {
          return false;
        }
      }
      item.units.forEach(unit=>{
        unit.prevCount = '';
        unit.change = false;
      })
      item.count=null;
      return true;
    });

    recipeHistory = list.concat(recipeHistory);

    // 这里判断如果历史记录长度超过20，则截取前20
    if (recipeHistory.length > 20) {
      recipeHistory = recipeHistory.slice(0, 20);
    }

    native.setStorage({
      key: RECIPE_HISTORY,
      data: recipeHistory
    }, true);
  },
  downloadAndPreviewImg(imgUrl) {
    let page = this, imgUrls = []; // 这个数组用户上传错误日志

    /*以下为重试相关代码*/
    let imgDownload = utils.retry(
      performImgDownload,
      errHandler,
      {retryCount: 1, log: true, wait: 2000, beforeRetry: (retryCount, currentCount) => {
        imgUrls.push(imgUrl);
        imgUrl = imgUrl.replace(
          app.globalData.config.aliyunOssCdnHost,
          app.globalData.config.aliyunOssCdnOriginalHost);
      }});
    imgDownload();

    function performImgDownload(retry, currentCount) {
      wx.getImageInfo({
        src: imgUrl,
        success(res) {
          page.setData({
            generated: true
          });

          previewImage(res);

          // 重试成功时，也要上传日志
          if (currentCount) {
            app.errorLog({
              url: 'downloadAndPreviewImgRetrySuccess',
              page: PAGE_INFO,
              code: '83001',
              imgUrls: JSON.stringify(imgUrls),
              serverData: JSON.stringify(res)
            });
          }
        },
        fail(err) {
          retry(err, null);
        }
      });
    }

    function errHandler(err, res) {
      app.loading();

      // 如果更换cdn地址后重试，再失败则直接previewImage
      previewImage({
        path: imgUrl
      });

      imgUrls.push(imgUrl); // 把最后一次请求的图片地址也上传上去
      app.errorLog({
        url:'downloadAndPreviewImgError',
        page: PAGE_INFO,
        code:'83001',
        imgUrls: JSON.stringify(imgUrls),
        serverData: JSON.stringify(err)
      });
    }

    // 预览图片
    function previewImage(res) {
      app.loading();

      wx.previewImage({
        current: res.path,
        urls: [res.path], // 需要预览的图片http链接列表
        success() {
          page.setData({
            generated: true
          });
        },
        fail(err) {
          page.setData({
            generated: true
          });

          app.errorLog({
            url: 'previewImageImgError',
            page: PAGE_INFO,
            code: '83001',
            imgUrls: JSON.stringify(imgUrls),
            serverData: JSON.stringify(err)
          });
        }
      })
    }
  },
  from(source) {
    switch (source) {
      case 'home':
        return 0;
      case 'out':
        return 1;
    }
  },
  recipeList(list) {
    let result = [];
    list.forEach(recipe => {
      let item = {
        name: recipe.name,
        num: recipe.count,
        energy: this.calorie(recipe),
        unit: recipe.unit.unit
      };

      // 如果不是自定义食材则添加食材id
      if (!recipe.custom) {
        item.id = recipe.id;
      }

      result.push(item);
    });
    return result;
  },
  calorie(recipe) {
    return recipe.custom ? UNKNOWN : recipe.current.calorie;
  }
});