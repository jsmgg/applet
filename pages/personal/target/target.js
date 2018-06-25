const Promise = require('../../../utils/lib/es6-promise.min.js');
const utils = require('../../../utils/util.js');

const app = getApp();

const PROGRESS_CANVAS_WIDTH = 220;
const PROGRESS_DIAMETER = 200;
const PROGRESS_RADIUS = PROGRESS_DIAMETER / 2;
const PROGRESS_LINE_WIDTH = 8;
const COLORS = {
  breakfast: ['#f5d100', '#54cd82'],
  lunch: ['#f9d423', '#ff4e50'],
  dinner: ['#cb408f', '#0b4fc3'],
  training: ['#00f2fe', '#4facfe']
};

const TARGET_PROGRESS_CANVAS_WIDTH = 360;
const TARGET_PROGRESS_DIAMETER = 335;
const TARGET_PROGRESS_RADIUS = TARGET_PROGRESS_DIAMETER / 2;
const TARGET_PROGRESS_LINE_WIDTH = 24;
const TARGET_COLORS = ['#00a67c', '#94de5e'];
const CHECKIN_EMPTY_COLOR = '#f2f2f2';
const TARGET_EMPTY_COLOR = '#3d444b';

const TOTAL_COLORS = ['#c2c1c1', '#c2c2c2'];
const WEIGHT_TYPE = 'weight';
const WAISTLINE_TYPE = 'waistLine';

Page({

  /**
   * 页面的初始数据
   */
  data: {
    weightSelect: 'weight-select',
    waistlineSelect: '',
    currentType: WEIGHT_TYPE,
    showTermList: false,
    tabList: [
      { name: "身体指标", class: "selected", hidden: false },
      { name: "饮食", class: "", hidden: true },
      { name: "运动", class: "", hidden: true }
    ],
    weightWeeks: [],
    waistLineWeeks: [],
    weightReduceValue: 0.0,
    weightReduceInfo: '',
    weightReduceDiff: '',
    waistLineReduceValue: 0.0,
    waistLineReduceInfo: '',
    waistLineReduceDiff: ''

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 获取屏幕宽度，方便进行响应式绘制
    app.getSystemInfo().then(res => {
      this.data.windowWidth = res.windowWidth;
      this.data.canvasHeight = this.toPx(381);

      // 存储绘制相关数据并存储
      let windowWidth = this.data.windowWidth;
      let canvasHeight = this.data.canvasHeight;
      let xCut = this.data.xCut = this.toPx(55); // 画布x方向左边留白
      let xRightCut = this.data.xRightCut = this.toPx(95); // 画布x方向右边留白
      let yCut = this.data.yCut = this.toPx(20); // 画布y方向顶部留白
      let bottomYCut = this.data.bottomYCut = this.toPx(30); // 画布y方向底部留白
      this.data.drawWidth = windowWidth - xCut - xRightCut - this.toPx(40 * 2); // 再减去左右两边的内边距
      this.data.drawHeight = canvasHeight - yCut - bottomYCut;
    });

    // 这里设置title bar标题
    wx.setNavigationBarTitle({
      title: '我的目标'
    })
  },
  onReady: function () {
    this.load();
  },
  load(termKey, reload) {
    app.loading('加载中...');

    return new Promise((resolve, reject) => {
      this.requestTargetDetail(termKey).then((data) => {
        app.loading();

        // 1.先处理数据
        this.initData(data, reload);
      }).then(() => {
        // 2.开始绘制
        // 总目标进度
        this.drawTargetProgress(this.data.currentType, reload);
        // 体重目标曲线
        this.drawTarget(WEIGHT_TYPE, reload);
        // 腰围目标曲线
        this.drawTarget(WAISTLINE_TYPE, reload);
        // 绘制打卡进度
        this.drawCheckProgress(reload);

        resolve();
      }).catch(err => {
        app.loading();
        reject();
      });
    });
  },
  requestTargetDetail(termKey, reload) {
    return new Promise((resolve, reject) => {
      app.send('targetDetail',
        termKey ? {termKey} : {},
        'get', {
        'Authorization': `Bearer ${app.globalData.token}`
      }).then(res => {
        let retcode = res.data.retcode;
        if (retcode === 200) {
          resolve(res.data.object, reload);
        } else {
          this.requestErrorHandler(null, res);
          reject(res);
        }
      }).catch(err => {
        this.requestErrorHandler(err, null);
        reject(err);
      });
    });
  },
  requestErrorHandler(err, res) {
    let code = '80014', errMsg = `服务异常(${code})`, serverData = err || {};
    if (res && (!res.data || !res.data.object)) {
      code = '80015';
      errMsg = (((res && res.data) || {}).retdesc || '服务异常') + code;
      serverData = res;
    }

    app.alert(errMsg);
    app.errorLog({
      url: 'targetDetail',
      code,
      page: 'target',
      userId: app.globalData.userId || '',
      serverData: JSON.stringify(serverData)
    });
  },
  initData(data, reload) {
    // 处理目标百分比数据
    this.initTargetData(WEIGHT_TYPE, data.weightTarget);
    this.initTargetData(WAISTLINE_TYPE, data.waistLineTarget);

    // 初始化阶段数据
    this.initWeeks(data, reload);

    // 将体重或腰围信息转换为坐标
    // 先处理体重
    this.dataToPos(
      WEIGHT_TYPE,
      data.weightList,
      data.weightTarget,
      reload
    );

    // 再处理腰围
    this.dataToPos(
      WAISTLINE_TYPE,
      data.waistLineList,
      data.waistLineTarget,
      reload
    );

    // 处理打卡百分比数据
    this.initCheckinData(data.taskList);

    // 这里将体重、腰围和打卡进度数据缓存起来
    this.cacheData(data);
    // 将需要展示在页面的数据渲染出来
    this.renderData(data);
  },
  initTargetData(type, targetData) {
    if (!targetData) {
      return;
    }

    let current = targetData.current; // 当前
    let original = targetData.original; // 入营
    let target = targetData.target; // 目标

    if (!current || !original || !target) {
      targetData.reduceValue = 0;
      targetData.reduceInfo = '已减重(kg)';
      targetData.reduceDiffTip1 = '离目标还差';
      targetData.reduceDiffValue = 0;
      targetData.reduceDiffTip2 = 'kg';
      targetData.percent = 0.0;

      this.data[`${type}ReduceData`] = targetData;

      return;
    }

    let reduceValue = original - current,
      reduceInfo = '';
    if (reduceValue >= 0) {
      reduceInfo = type === WEIGHT_TYPE ? '已减重(kg)' : '已减腰围(cm)';
    } else {
      reduceValue = -reduceValue;
      reduceInfo = type === WEIGHT_TYPE ? '已增重(kg)' : '已增腰围(cm)';
    }
    targetData.reduceValue = reduceValue.toFixed(1);
    targetData.reduceInfo = reduceInfo;

    let diffValue = utils.toFixed(current, 1) - utils.toFixed(target, 1),
      reduceDiffTip1 = '', reduceDiffTip2 = '', reduceDiffValue = 0;
    if (diffValue > 0.0) {
      reduceDiffTip1 = '离目标还差';
      reduceDiffValue = diffValue;
      reduceDiffTip2 = type === WEIGHT_TYPE ? 'kg' : 'cm';
    } else if (diffValue === 0.0) {
      reduceDiffTip1 = '刚好达成目标';
    } else {
      reduceDiffTip1 = '超出目标';
      reduceDiffValue = -diffValue;
      reduceDiffTip2 = type === WEIGHT_TYPE ? 'kg' : 'cm';
    }
    targetData.reduceDiffTip1 = reduceDiffTip1;
    targetData.reduceDiffValue = reduceDiffValue ? reduceDiffValue.toFixed(1) : '';
    targetData.reduceDiffTip2 = reduceDiffTip2;

    current = Math.max(Math.min(current, original), target); // 将当前值收缩到原始或目标

    targetData.percent = diffValue === 0.0 ? 1 :
      Math.abs(original - current) / Math.abs(original - target);

    this.data[`${type}ReduceData`] = targetData;
  },
  initWeeks(data, reload) {
    if (reload) {
      this.data.weightWeeks = [];
      this.data.waistLineWeeks = [];
    }

    if (data.weightList) {
      data.weightList.forEach((item, index) => {
        this.data.weightWeeks.push(index === 0 ? '入营': index);
      });
    }
    if (data.waistLineList) {
      data.waistLineList.forEach((item, index) => {
        this.data.waistLineWeeks.push(index === 0 ? '入营': index);
      });
    }

    this.data.currentWeek = data.currentWeek;
    this.data.currentState = parseInt(data.currentState);
  },
  dataToPos(type, currents, target, reload) {
    if (reload) {
      this.data[`current${this.capital(type)}Poses`] = null;
    }

    if (!this.isValid(currents)) {
      return;
    }

    let data = this.data;
    let targetValue = parseFloat(target.target);
    let {max, min} = this.getMaxAndMin(currents, targetValue);
    let range = max !== min ? max - min : 1; // 需要考虑最大值等于最小值，也就是所有值都一样的情况

    let drawWidth = data.drawWidth;
    let drawHeight = data.drawHeight;
    let dataPointYCut = this.toPx(80); // 最大数据点距画布顶部偏移量
    let dataPointYBottomCut = this.toPx(40); // 最小数据点距y轴偏移量
    let dataPointYCanvasBottomCut = this.toPx(36) + dataPointYBottomCut; // 最小数据点距画布底部偏移量，36 = 刻度文字与x轴的距离 + 文字大小
    let dataPointMaxHeight = drawHeight - dataPointYCut - dataPointYCanvasBottomCut; // 数据点最大高度
    let xOffset = drawWidth / (currents.length - 1);
    let currentDataPoses = [];

    for (let i = 0; i < currents.length; i++) {
      if (i < currents.length && currents[i]) {
        currentDataPoses.push({
          x: i * xOffset,
          y: dataPointYCut + dataPointMaxHeight -
            this.calcRate(currents, max, min, range, i) *
            dataPointMaxHeight,
          [type]: currents[i],
        });
      }
    }
    this.data[`current${this.capital(type)}Poses`] = currentDataPoses;
    this.data[`${type}Target`] = utils.toFixed(target.target, 1);
  },
  getMaxAndMin(list, target) {
    let max = 0, min = 0, page = this;

    let listWithoutZero = this.filterZero(list);
    if (listWithoutZero.length > 1) {
      return {
        max: page.max(listWithoutZero),
        min: page.minWithoutZero(listWithoutZero)
      };
    } else {
      let only = listWithoutZero[0];
      max = only > target ? only : target;
      min = only > target ? target: only;

      return { max, min };
    }
  },
  filterZero(list) {
    return list.filter(item => item);
  },
  // 数据合法化处理
  calcRate(list, max, min, range, idx) {
    if(max === min) {
      return 1;
    }

    let diff = list[idx] - min;
    if (diff === 0) {
      return 0;
    } else {
      if (range === 0) {
        return list[idx] / max;
      } else {
        return diff / range;
      }
    }

  },
  // 数据点曲线化
  curvify(type) {
    let poses = this.data[`current${this.capital(type)}Poses`];

    if (!this.isValid(poses)) {
      return;
    }

    // 为方便计算前后增加两个空点
    poses.unshift(poses[0]);
    poses.push(poses[poses.length - 1]);

    // 系数，可以做略微调整
    const a = 0.15;
    const b = 0.15;
    poses = poses.map((pos, i) => {
      if (i === 0 || i === 1 || i === poses.length - 1) {
        return pos;
      } else {
        const a1 = poses[i - 1].x + a * (poses[i].x - poses[i - 2].x);
        const a2 = poses[i - 1].y + b * (poses[i].y - poses[i - 2].y);
        const b1 = poses[i].x - b * (poses[i + 1].x - poses[i - 1].x);
        const b2 = poses[i].y - b * (poses[i + 1].y - poses[i - 1].y);
        return {
          a1, a2, b1, b2, x: pos.x, y: pos.y, [type]: pos[type], good: pos.good
        };
      }
    });

    this.data[`current${this.capital(type)}Poses`] = poses;
  },
  initCheckinData(taskList) {
    if (!this.isValid(taskList)) {
      return;
    }

    // 这里将百分比小数点后面的0去掉
    taskList = taskList.map(task => {
      task.completePercent = this.removeZeroAfterDot(task.completePercent);
      task.totalPercent = this.removeZeroAfterDot(task.totalPercent);

      return task;
    });

    this.setData({
      breakfast: taskList[0],
      lunch: taskList[1],
      dinner: taskList[2],
      sports: taskList[3]
    });
  },
  cacheData(data) {
    let pageData = this.data;
    pageData.taskList = data.taskList;
    pageData.weightList = data.weightList;
    pageData.waistLineList = data.waistLineList;
  },
  renderData(data) {
    // 弹个小框
    if (data.hasTarget === 0) {
      app.alert('请联系您的私人教练发送测量入口，完成"开营身体数据"上传。生成您的目标体重！');
    }

    let renderData = {};
    // 判断是否展示目标管理按钮
    let termList = data.termList;
    if (termList && termList.length) {
      // 将学期数据渲染到页面
      renderData.showTargetBtn = true;
      renderData.termList = termList;
    }

    // 当前学期
    renderData.currentTermKey = data.currentTermKey;

    this.setData(renderData);
  },
  // 切换体重和腰围
  toggle(event) {
    // 切换按钮样式
    this.toggleBtnStyle();

    let currentType = this.data.currentType;
    this.data.currentType = currentType === WEIGHT_TYPE ? WAISTLINE_TYPE : WEIGHT_TYPE;

    // 重绘曲线
    this.drawTargetProgress(this.data.currentType, true);
  },
  toggleBtnStyle() {
    let data = this.data;
    let style = {};
    // 如果现在是腰围
    if (data.right) {
      style.right = '';
      style.weightSelect = 'weight-select';
      style.waistlineSelect = '';
    // 如果现在是体重
    } else {
      style.right = 'right';
      style.weightSelect = '';
      style.waistlineSelect = 'waistline-select';
    }
    this.setData(style);
  },
  toggleTermList(event) {
    let showTermList = this.data.showTermList;

    this.setData({
      showTermList: !showTermList
    });
  },
  hideTermList(event) {
    let showTermList = this.data.showTermList;

    showTermList && this.setData({
      showTermList: !showTermList
    });
  },
  switchTerm(event) {
    console.log('swi');
    let dataset = event.currentTarget.dataset;
    let termKey = dataset.termKey;
    let currentTermKey = this.data.currentTermKey;

    // 只有选择的学期不是当前学期才行
    if (termKey !== currentTermKey) {
      this.load(termKey, true).then(() => {
        this.setData({currentTermKey: termKey});
      });
    }

    // 隐藏学期列表
    this.hideTermList();
  },
  hideTermList(event) {
    this.setData({
      showTermList: false
    });
  },
  drawTargetProgress(type, reDraw) {
    let ctx = wx.createCanvasContext('targetProgress');
    // 如果需要则清除画布
    reDraw && this.clearProgress(ctx);

    let windowWidth = this.data.windowWidth;

    // 重置坐标轴
    this.resetTargetProgressCoordinate(ctx, windowWidth);

    // 先绘制空进度
    this.drawTargetEmptyProgress(ctx);
    // 绘制减重进度
    let reduceData = this.data[`${type}ReduceData`];
    if (reduceData && reduceData.percent) {
      this.drawTargetCompleteProgress(ctx, TARGET_COLORS, reduceData.percent);
    }

    ctx.draw();

    this.setData({
      reduceValue: reduceData.reduceValue,
      reduceInfo: reduceData.reduceInfo,
      reduceDiffTip1: reduceData.reduceDiffTip1,
      reduceDiffValue: reduceData.reduceDiffValue,
      reduceDiffTip2: reduceData.reduceDiffTip2
    });
  },
  drawTarget(type, reDraw) {
    let ctx = wx.createCanvasContext(`${type}Curve`);
    // 如果需要则清除画布
    reDraw && this.clearTarget(ctx);
    this.drawTargetCurve(ctx, type);
    ctx.draw();
  },
  clearTarget(ctx) {
    ctx.clearRect(0, 0, this.data.windowWidth, this.data.canvasHeight);
  },
  drawTargetCurve(ctx, type) {
    // 坐标轴变换方便计算
    this.resetCurvesCoordinate(ctx);
    // 绘制背景
    this.drawBgBox(ctx, type);
    // 绘制内容
    this.drawContent(ctx, type);
  },
  resetCurvesCoordinate(ctx) {
    let xCut = this.data.xCut;
    let yCut = this.data.yCut;
    let height = this.data.canvasHeight;

    ctx.translate(xCut, yCut);
  },
  drawBgBox(ctx, type) {
    // 1.绘制阶段轴
    this.drawWeekAxle(ctx, type);
  },
  drawContent(ctx, type) {
    // 2.绘制目标
    this.drawTargetText(ctx, type);
    // 3.绘制曲线
    this.drawCurves(ctx, type); // 直线
    // 4.绘制渐变背景
    this.drawCurveGradientBg(ctx, type);
    // 5.绘制数据点
    this.drawCurveDataPoint(ctx, type);
    // 6.绘制文字
    this.drawText(ctx, type);
  },
  drawCurveGradientBg(ctx, type) {
    let drawWidth = this.data.drawWidth;
    let drawHeight = this.data.drawHeight;
    let poses = this.data[`current${this.capital(type)}Poses`];
    // 健壮性判断
    if (!poses || poses.length <= 1) {
      return;
    }

    let lg = ctx.createLinearGradient(0,0,0,drawHeight);
    if (type === WEIGHT_TYPE) {
      lg.addColorStop(0, 'rgba(90, 204, 119, .2)');
      lg.addColorStop(1, 'rgba(90, 204, 119, .0)');
    } else {
      lg.addColorStop(0, 'rgba(254, 96, 73, .2)');
      lg.addColorStop(1, 'rgba(254, 96, 73, .0)');
    }

    ctx.setFillStyle(lg);
    ctx.beginPath();
    ctx.moveTo(poses[0].x || 0, poses[0].y || 0);
    poses.forEach(pos => {
      ctx.lineTo(pos.x, pos.y);
    });
    ctx.lineTo(poses[poses.length - 1].x || drawWidth, drawHeight);
    ctx.lineTo(poses[0].x || 0, drawHeight);
    ctx.lineTo(poses[0].x || 0, poses[0].y || 0);
    ctx.closePath();
    ctx.fill();
  },
  drawWeekAxle(ctx, type) {
    let drawHeight = this.data.drawHeight;
    let drawWidth = this.data.drawWidth;
    let weeks = this.data[`${type}Weeks`];
    let weekCount = weeks.length;
    let currentWeek = this.data.currentWeek;

    ctx.setFontSize(this.toPx(24));
    ctx.setTextAlign('center');

    let week;
    let xOffset = drawWidth / (weekCount - 1) || 0;
    for (let i = 0; i < weekCount; i++) {
      week = weeks[i];
      if (type === WEIGHT_TYPE) {
        ctx.setFillStyle(week === currentWeek ? '#00a67c' : '#000000');
      } else {
        ctx.setFillStyle(week === currentWeek ? '#ff5a58' : '#000000');
      }
      ctx.fillText(week, xOffset * i, drawHeight);
    }

    ctx.setFillStyle('#adadad');
    ctx.fillText('(周)', drawWidth + this.toPx(45), drawHeight); // 45 = 偏离y轴的距离，TODO 也是试出来的

    // 画轴线
    ctx.setLineWidth(1);
    ctx.setStrokeStyle('#e5e5e5');

    ctx.beginPath();
    ctx.moveTo(0, drawHeight - this.toPx(36)); // 36 = 刻度文字与x轴的距离 + 文字大小
    ctx.lineTo(drawWidth + this.toPx(55), drawHeight - this.toPx(36));
    ctx.stroke();
  },
  // 画直线
  drawCurves(ctx, type) {
    let currentPoses = this.data[`current${this.capital(type)}Poses`];
    if (!currentPoses || !currentPoses.length) {
      return;
    }

    ctx.setLineWidth(this.toPx(6));

    let pos, lastPos = currentPoses[0];
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    for (let i = 1, len = currentPoses.length; i < len; i++) {
      pos = currentPoses[i];

      // 这里每次都得创建一个新的渐变
      // FIXME 这里是为了解决，android，在同一个canvas内，
      // FIXME 先用gradient绘制了线条后，无法setStrokeStyle设置为普通颜色的Bug
      let gd = ctx.createLinearGradient(0, 0, pos.x, pos.y);
      gd.addColorStop(0, type === WEIGHT_TYPE ? '#5acc77' : '#fe5c4b');
      gd.addColorStop(1, type === WEIGHT_TYPE ? '#5acc77' : '#fe5c4b');
      ctx.setStrokeStyle(gd);

      if (i === 1) {
        ctx.lineTo(pos.x, pos.y);
      } else {
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(pos.x, pos.y);
      }
      ctx.stroke();
      lastPos = pos;
    }
  },
  // 画曲线
  drawBendCurves(ctx, type) {
    let currentPoses = this.data[`current${this.capital(type)}Poses`];
    if (!currentPoses || !currentPoses.length) {
      return;
    }

    ctx.setLineWidth(this.toPx(6));

    let pos, lastPos = currentPoses[1];
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    for (let i = 1, len = currentPoses.length - 1; i < len; i++) {
      pos = currentPoses[i];

      // 这里每次都得创建一个新的渐变
      // FIXME 这里是为了解决，android，在同一个canvas内，
      // FIXME 先用gradient绘制了线条后，无法setStrokeStyle设置为普通颜色的Bug
      let gd = ctx.createLinearGradient(0, 0, pos.x, pos.y);
      gd.addColorStop(0, pos.good ? '#2cb190' : '#fe5b4c');
      gd.addColorStop(1, pos.good ? '#2cb190' : '#fe5b4c');
      ctx.setStrokeStyle(gd);

      if (i === 1) {
        ctx.lineTo(pos.x, pos.y);
      } else {
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        if(lastPos.y === pos.y) {
          ctx.lineTo(pos.x, pos.y);
        } else {
          ctx.bezierCurveTo(pos.a1, pos.a2, pos.b1, pos.b2, pos.x, pos.y);
        }
      }
      ctx.stroke();
      lastPos = pos;
    }
  },
  drawCurveDataPoint(ctx, type) {
    let currentWeek = this.data.currentWeek;
    let currentPoses = this.data[`current${this.capital(type)}Poses`];
    // 健壮性判断
    if (!currentPoses || !currentPoses.length) {
      return;
    }

    for (let i = 0, len = currentPoses.length; i < len; i++) {
      let pos = currentPoses[i];

      if (i === currentWeek) {
        ctx.setFillStyle(type === WEIGHT_TYPE ? 'rgba(91,204,118,.3)' : 'rgba(255,205,200,.3)');
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, this.toPx(24 / 2), 0, 2 * Math.PI);
        ctx.fill();
      }

      // 再画颜色小圆
      ctx.setFillStyle(type === WEIGHT_TYPE ? '#2cb190' : '#fe5c4b');
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, this.toPx(12 / 2), 0, 2 * Math.PI);
      ctx.fill();
    }
  },
  drawText(ctx, type) {
    let currentWeek = this.data.currentWeek;
    let currentPoses = this.data[`current${this.capital(type)}Poses`];
    // 健壮性判断
    if (!currentPoses || !currentPoses.length) {
      return;
    }

    ctx.setTextAlign('center');

    for (let i = 0, len = currentPoses.length; i < len; i++) {
      let pos = currentPoses[i];

      ctx.setFontSize( i === currentWeek ? this.toPx(30) : this.toPx(24));

      if (type === WEIGHT_TYPE) {
        ctx.setFillStyle( i === currentWeek ? 'rgb(44,177,144)' : 'rgba(44,177,144,.7)');
      } else {
        ctx.setFillStyle( i === currentWeek ? 'rgb(255,82,79)' : 'rgba(254,91,76,.7)');
      }

      ctx.fillText(
        `${pos[type].toFixed(1)}`,
        pos.x,
        pos.y - this.toPx(25)); // 25 = 数据点和数据文字的距离
    }
  },
  drawTargetText(ctx, type) {
    let drawWidth = this.data.drawWidth;
    let drawHeight = this.data.drawHeight;

    // 健壮性判断
    let currentList = this.data[`${type}List`];
    if (!currentList || !currentList.length) {
      return;
    }

    // 为防止转换坐标轴后，影响其他绘制，这里先保存
    ctx.save();

    ctx.rotate(0.5 * Math.PI);
    ctx.translate(0, -drawWidth);

    ctx.setFontSize(this.toPx(20));
    ctx.setTextAlign('center');
    ctx.setFillStyle('#bfbfbf');

    ctx.fillText(
      `目标:${this.data[`${type}Target`]}${type === WEIGHT_TYPE ? 'kg' : 'cm'}`,
      drawHeight - this.toPx(100),
      -this.toPx(45));

    // 然后这里恢复
    ctx.restore();

    // 绘制单位
    ctx.setFontSize(this.toPx(22));
    ctx.setTextAlign('center');
    ctx.setFillStyle('#adadad');

    ctx.fillText(`单位:${type === WEIGHT_TYPE ? 'kg' : 'cm'}`, drawWidth + this.data.xCut - this.toPx(25), this.data.yCut);
  },
  drawCheckProgress(reDraw) {
    // 健壮性判断
    let taskList = this.data.taskList;
    if (!taskList && !taskList.length) {
      return;
    }

    this.data.taskList.forEach((item) => {
      this.showProgress(
        item.type.toLowerCase(),
        parseFloat(item.totalPercent) / 100,
        parseFloat(item.completePercent) / 100,
        reDraw);
    });
  },
  showProgress(canvasId, totalPercent, completePercent, reDraw) {
    let ctx = wx.createCanvasContext(canvasId);
    // 如果需要则清除画布
    reDraw && this.clearProgress(ctx);

    // 重置坐标轴
    this.resetProgressCoordinate(ctx);

    // 先绘制空进度
    this.drawEmptyProgress(ctx);
    // 再绘制打卡总进度
    if (totalPercent) {
      this.drawTotalProgress(ctx, TOTAL_COLORS, totalPercent);
    }
    // 绘制打卡完成进度
    if (completePercent) {
      this.drawCompleteProgress(ctx, COLORS[canvasId], completePercent);
    }

    ctx.draw();
  },
  clearProgress(ctx) {
    let size = this.toPx(PROGRESS_DIAMETER);
    ctx.clearRect(-size / 2, size / 2, size / 2, -size / 2);
  },
  resetProgressCoordinate(ctx) {
    // 重置坐标轴
    ctx.translate(
      this.toPx(PROGRESS_CANVAS_WIDTH / 2),
      this.toPx(PROGRESS_CANVAS_WIDTH / 2));
    ctx.rotate(0.5 * Math.PI);
  },
  resetTargetProgressCoordinate(ctx) {
    // 重置坐标轴
    ctx.translate(
      this.toPx(TARGET_PROGRESS_CANVAS_WIDTH / 2),
      this.toPx(TARGET_PROGRESS_CANVAS_WIDTH / 2));
    ctx.rotate(0.5 * Math.PI);
  },
  drawEmptyProgress(ctx) {
    this.drawProgressArc(ctx, CHECKIN_EMPTY_COLOR, 0.2 * Math.PI, 1.8 * Math.PI);
  },
  drawTargetEmptyProgress(ctx) {
    this.drawTargetProgressArc(ctx, TARGET_EMPTY_COLOR, 0.2 * Math.PI, 1.8 * Math.PI);
  },
  drawTotalProgress(ctx, colors, progress) {
    let lg = this.genGradient(ctx, colors, progress);
    this.drawProgressArc(ctx, lg, 0.2 * Math.PI, (0.2 + 1.6 * progress) * Math.PI);
  },
  drawCompleteProgress(ctx, colors, progress) {
    // 如果百分比大于50%，则分段画圆
    if (progress > 0.5) {
      // 计算中间色
      let middleColor = this.calcMiddleColor(colors, progress);
      let tmpColors = [].concat(colors);
      tmpColors.splice(1, 0, middleColor);

      // 渐变角度
      let lgs = this.genStageGradient(ctx, tmpColors, progress);

      // 先画第一段
      this.drawProgressArc(ctx, lgs[0], 0.2 * Math.PI, Math.PI);
      // 再画第二段
      this.drawProgressArc(ctx, lgs[1], Math.PI, (0.2 + 1.6 * progress) * Math.PI);

    // 否则直接画一段
    } else {
      // 渐变角度
      let lg = this.genSingleGradient(ctx, colors, progress);

      this.drawProgressArc(ctx, lg, 0.2 * Math.PI, (0.2 + 1.6 * progress) * Math.PI);
    }
  },
  drawTargetCompleteProgress(ctx, colors, progress) {
    // 如果百分比大于50%，则分段画圆
    if (progress > 0.5) {
      // 计算中间色
      let middleColor = this.calcMiddleColor(colors, progress);
      let tmpColors = [].concat(colors);
      tmpColors.splice(1, 0, middleColor);

      // 渐变角度
      let lgs = this.genTargetStageGradient(ctx, tmpColors, progress);

      // 先画第一段
      this.drawTargetProgressArc(ctx, lgs[0], 0.2 * Math.PI, Math.PI);
      // 再画第二段
      this.drawTargetProgressArc(ctx, lgs[1], Math.PI, (0.2 + 1.6 * progress) * Math.PI);

      // 否则直接画一段
    } else {
      // 渐变角度
      let lg = this.genTargetSingleGradient(ctx, colors, progress);

      this.drawTargetProgressArc(ctx, lg, 0.2 * Math.PI, (0.2 + 1.6 * progress) * Math.PI);
    }
  },
  drawProgressArc(ctx, style, from, to) {
    ctx.setStrokeStyle(style);
    ctx.setLineWidth(this.toPx(PROGRESS_LINE_WIDTH));
    ctx.setLineCap('round');
    ctx.beginPath();
    ctx.arc(0, 0, this.toPx(PROGRESS_RADIUS), from, to, false);
    ctx.stroke();
  },
  drawTargetProgressArc(ctx, style, from, to) {
    ctx.setStrokeStyle(style);
    ctx.setLineWidth(this.toPx(TARGET_PROGRESS_LINE_WIDTH));
    ctx.setLineCap('round');
    ctx.beginPath();
    ctx.arc(0, 0, this.toPx(TARGET_PROGRESS_RADIUS), from, to, false);
    ctx.stroke();
  },
  genGradient(ctx, colors, progress) {
    let ga = 0;
    let gd = [
      PROGRESS_RADIUS * (1 - Math.cos(ga)), // x0
      PROGRESS_RADIUS * (1 + Math.sin(ga)), // y0
      PROGRESS_RADIUS * (1 + Math.cos(ga)), // x1
      PROGRESS_RADIUS * (1 - Math.sin(ga))  // y1
    ];
    let lg = ctx.createLinearGradient.apply(ctx, gd);

    for (let i = 0; i < colors.length; i++) {
      let color = colors[i],
          pos = i / (colors.length - 1);
      lg.addColorStop(pos, color);
    }

    return lg;
  },
  genSingleGradient(ctx, colors, progress) {
    let startGa = 0.2 * Math.PI, endGa = (0.2 + 1.6 * progress) * Math.PI;

    let lg = ctx.createLinearGradient(
      PROGRESS_RADIUS * (Math.cos(startGa)),
      PROGRESS_RADIUS * (Math.sin(startGa)),
      PROGRESS_RADIUS * (Math.cos(endGa)),
      PROGRESS_RADIUS * (Math.sin(endGa)),);
    lg.addColorStop(0, colors[0]);
    lg.addColorStop(1, colors[1]);

    return lg;
  },
  genTargetSingleGradient(ctx, colors, progress) {
    let startGa = 0.2 * Math.PI, endGa = (0.2 + 1.6 * progress) * Math.PI;

    let lg = ctx.createLinearGradient(
      TARGET_PROGRESS_RADIUS * (Math.cos(startGa)),
      TARGET_PROGRESS_RADIUS * (Math.sin(startGa)),
      TARGET_PROGRESS_RADIUS * (Math.cos(endGa)),
      TARGET_PROGRESS_RADIUS * (Math.sin(endGa)),);
    lg.addColorStop(0, colors[0]);
    lg.addColorStop(1, colors[1]);

    return lg;
  },
  genStageGradient(ctx, colors, progress) {
    let startGa = 0.2 * Math.PI, endGa = (0.2 + 1.6 * progress) * Math.PI;

    // 第一段的渐变
    let firstColors = colors.slice(0, 2);
    let lg1 = ctx.createLinearGradient(
      PROGRESS_RADIUS * (Math.cos(startGa)),
      PROGRESS_RADIUS * (Math.sin(startGa)),
      -PROGRESS_RADIUS,
      0);
    lg1.addColorStop(0.2, firstColors[0]);
    lg1.addColorStop(0.79, firstColors[1]);

    // 第二段的渐变
    let secondColors = colors.slice(1, 3);
    let lg2 = ctx.createLinearGradient(
      -PROGRESS_RADIUS,
      0,
      PROGRESS_RADIUS * (Math.cos(endGa)),
      PROGRESS_RADIUS * (Math.sin(endGa)));
    lg2.addColorStop(0.21, secondColors[0]);
    lg2.addColorStop(1, secondColors[1]);

    return [lg1, lg2];
  },
  genTargetStageGradient(ctx, colors, progress) {
    let startGa = 0.2 * Math.PI, endGa = (0.2 + 1.6 * progress) * Math.PI;

    // 第一段的渐变
    let firstColors = colors.slice(0, 2);
    let lg1 = ctx.createLinearGradient(
      TARGET_PROGRESS_RADIUS * (Math.cos(startGa)),
      TARGET_PROGRESS_RADIUS * (Math.sin(startGa)),
      -TARGET_PROGRESS_RADIUS,
      0);
    lg1.addColorStop(0.2, firstColors[0]);
    lg1.addColorStop(0.79, firstColors[1]);

    // 第二段的渐变
    let secondColors = colors.slice(1, 3);
    let lg2 = ctx.createLinearGradient(
      -TARGET_PROGRESS_RADIUS,
      0,
      TARGET_PROGRESS_RADIUS * (Math.cos(endGa)),
      TARGET_PROGRESS_RADIUS * (Math.sin(endGa)));
    lg2.addColorStop(0.21, secondColors[0]);
    lg2.addColorStop(1, secondColors[1]);

    return [lg1, lg2];
  },
  calcMiddleColor(colors, progress) {
    let start = this.colorRgb(colors[0]);
    let end = this.colorRgb(colors[1]);

    let middle = 'rgb(' + [
      Math.floor(this.calcMiddleValue(start[0], end[0], progress)),
      Math.floor(this.calcMiddleValue(start[1], end[1], progress)),
      Math.floor(this.calcMiddleValue(start[2], end[2], progress))
    ].join(',') + ')';
    return middle;
  },
  calcMiddleValue(start, end, progress) {
    let min, max;
    if (start > end) {
      min = end;
      max = start;
    } else {
      min = start;
      max = end;
    }

    return min + (max - min) * (progress - 0.5) / progress;
  },
  colorRgb(hex) {
    var sColor = hex.toLowerCase();
    //十六进制颜色值的正则表达式
    var reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
    // 如果是16进制颜色
    if (sColor && reg.test(sColor)) {
      if (sColor.length === 4) {
        let sColorNew = "#";
        for (let i = 1; i < 4; i += 1) {
          sColorNew += sColor.slice(i, i+1).concat(sColor.slice(i, i+1));
        }
        sColor = sColorNew;
      }
      //处理六位的颜色值
      let sColorChange = [];
      for (let i=1; i<7; i+=2) {
        sColorChange.push(parseInt("0x"+sColor.slice(i, i+2)));
      }
      // return "RGB(" + sColorChange.join(",") + ")";
      return sColorChange;
    }
    return sColor;
  },
  toPx(rpx) {
    let windowWidth = this.data.windowWidth;
    return utils.rpx_to_px(rpx, windowWidth);
  },
  capital(str) {
    return str.substr(0, 1).toUpperCase() + str.substr(1);
  },
  isValid(obj) {
    let isArray = utils.isArray(obj);
    if (isArray) {
      return obj.length > 0;
    } else {
      return isArray;
    }
  },
  max(obj) {
    if (!this.isValid(obj)) {
      return void 0;
    }

    let max = obj[0];
    obj.forEach(item => {
      if (item > max) {
        max = item;
      }
    });

    return max;
  },
  minWithoutZero(obj) {
    if (!this.isValid(obj)) {
      return void 0;
    }

    let min = obj[0];
    obj.forEach(item => {
      if (item > 0 && item <= min) {
        min = item;
      }
    });

    return min;
  },
  removeZeroAfterDot(str) {
    if (!utils.isString(str)) {
      return str;
    }

    let dotIdx = str.indexOf('.');
    if (dotIdx >= 0) {
      let afterDot = str.charAt(dotIdx + 1);
      if (afterDot === '0') {
        str = str.substr(0, dotIdx);
      }
    }

    return str;
  },
  tabSwitch(e) {
    let id = parseInt(e.currentTarget.id);
    this.data.tabList.forEach((item, index) => {
      item.class = index === id ? 'selected' : '';
      item.hidden = index !== id;
    });
    this.setData({
     tabList: this.data.tabList
    });
  }
});