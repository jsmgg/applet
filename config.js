module.exports = {
  dev: {
    debug : 1,
    loginUrl: 'https://oauthtest.rjft.net/api/v2/wxappSignIn',
    registerUrl: 'https://oauthtest.rjft.net/api/v2/wxappSignUp',
    requestVerifyCode: 'https://oauthtest.rjft.net/api/v2/sms/requestVerifyCode',
    userInfoUrl: 'https://oauthtest.rjft.net/api/v2/User',
    bindPhoneUrl: 'https://oauthtest.rjft.net/api/v2/sms/bindPhone',
    currentApplyUrl: 'http://malldev.rjfittime.com/fitcamp/apply/currentApply.json',
    currentCourseUrl: 'http://malldev.rjfittime.com/customCourse/currentCourse.json',
    courseWorkoutUrl:'https://coursetest.rjft.net/training/course/{COURSEID}/workout/{WOKROUTID}',
    userDiet:'http://malldev.rjfittime.com/fitcamp/apply/userDiet.json',
    mergeAcount:'http://malldev.rjfittime.com/weixin/migrate.json',
    transferAcount:'http://malldev.rjfittime.com/weixin/transfer.json',
    singlePlan: 'https://coursetest.rjft.net/course/{id}/recursive',
    checkinStatus:'http://malldev.rjfittime.com/wxapp/fitcamp/checkinStatus.json',
    checkinRecords:'http://malldev.rjfittime.com/wxapp/fitcamp/checkinRecords.json',
    checkin:'http://malldev.rjfittime.com/wxapp/fitcamp/checkin.json',
    checkinNew:'http://malldev.rjfittime.com/fitcampApplet/checkIn/checkin.json',
    recipes:'http://malldev.rjfittime.com/wxapp/fitcamp/checkinRecipes.json',
    uploadImage:'http://malldev.rjfittime.com/uploadImage.html',
    uploadImageQiNiu:'http://upload.qiniup.com',
    queryCurrentTrain:'http://malldev.rjfittime.com/fitcampApplet/queryCurrentTrain.json',
    queryModuleTrainList:'http://malldev.rjfittime.com/fitcampApplet/queryModuleTrainList.json',
    queryTrainHistory:'http://malldev.rjfittime.com/fitcampApplet/queryTrainHistory.json',
    config:'http://malldev.rjfittime.com/wxapp/config.json',
    uploadToken:'http://malldev.rjfittime.com/uploadToken.json',
    errorLog:'https://log.rjft.net',
    scoreList:'http://malldev.rjfittime.com/fitcampApplet/scoreList.json',
    exchangeScore:'http://malldev.rjfittime.com/fitcampApplet/exchangeScore.json',
    wechatStep:'http://malldev.rjfittime.com/fitcampApplet/wechatStep.json',
    getUserMobile : 'https://oauthtest.rjft.net/api/v2/User',
    targetDetail:'http://malldev.rjfittime.com/fitcampApplet/targetDetail.json',
    queryTrain:'http://malldev.rjfittime.com/fitcampApplet/checkIn/queryTrain.json',
    queryRecipe: 'http://malldev.rjfittime.com/fitcampApplet/checkIn/queryRecipe.json'
  },
  test : {
    debug : 1,
    loginUrl: 'https://oauthtest.rjft.net/api/v2/wxappSignIn',
    registerUrl: 'https://oauthtest.rjft.net/api/v2/wxappSignUp',
    requestVerifyCode: 'https://oauthtest.rjft.net/api/v2/sms/requestVerifyCode',
    userInfoUrl: 'https://oauthtest.rjft.net/api/v2/User',
    bindPhoneUrl: 'https://oauthtest.rjft.net/api/v2/sms/bindPhone',
    currentApplyUrl: 'https://malltest.rjfittime.com/fitcamp/apply/currentApply.json',
    currentCourseUrl: 'https://malltest.rjfittime.com/customCourse/currentCourse.json',
    courseWorkoutUrl:'https://coursetest.rjft.net/training/course/{COURSEID}/workout/{WOKROUTID}',
    userDiet:'https://malltest.rjfittime.com/fitcamp/apply/userDiet.json',
    mergeAcount:'https://malltest.rjfittime.com/weixin/migrate.json',
    transferAcount:'https://malltest.rjfittime.com/weixin/transfer.json',
    singlePlan: 'https://coursetest.rjft.net/course/{id}/recursive',
    checkinStatus:'https://malltest.rjfittime.com/wxapp/fitcamp/checkinStatus.json',
    checkinRecords:'https://malltest.rjfittime.com/wxapp/fitcamp/checkinRecords.json',
    checkin:'https://malltest.rjfittime.com/wxapp/fitcamp/checkin.json',
    checkinNew:'https://malltest.rjfittime.com/fitcampApplet/checkIn/checkin.json',
    recipes:'https://malltest.rjfittime.com/wxapp/fitcamp/checkinRecipes.json',
    uploadImage:'https://malltest.rjfittime.com/uploadImage.html',
    uploadImageQiNiu:'https://upload.qiniup.com',
    queryCurrentTrain:'https://malltest.rjfittime.com/fitcampApplet/queryCurrentTrain.json',
    queryModuleTrainList:'https://malltest.rjfittime.com/fitcampApplet/queryModuleTrainList.json',
    queryTrainHistory:'https://malltest.rjfittime.com/fitcampApplet/queryTrainHistory.json',
    config:'https://malltest.rjfittime.com/wxapp/config.json',
    uploadToken:'https://malltest.rjfittime.com/uploadToken.json',
    errorLog:'https://log.rjft.net',
    scoreList:'https://malltest.rjfittime.com/fitcampApplet/scoreList.json',
    exchangeScore:'https://malltest.rjfittime.com/fitcampApplet/exchangeScore.json',
    wechatStep:'https://malltest.rjfittime.com/fitcampApplet/wechatStep.json',
    getUserMobile : 'https://oauthtest.rjft.net/api/v2/User',
    targetDetail:'https://malltest.rjfittime.com/fitcampApplet/targetDetail.json',
    queryTrain:'https://malltest.rjfittime.com/fitcampApplet/checkIn/queryTrain.json',
    queryRecipe: 'https://malltest.rjfittime.com/fitcampApplet/checkIn/queryRecipe.json',
    reportList: 'https://malltest.rjfittime.com/wxapp/fitcamp/weekList.json',
    H5_testpage: 'https://malltest.rjfittime.com/customCourse/common.html',
    H5_bodydata:'https://malltest.rjfittime.com/bodyData/commonInput.html',
    H5_starList:'https://malltest.rjfittime.com/fitcampApplet/startList.html?applyId={applyId}',
    H5_startUpload: 'https://malltest.rjfittime.com/fitcampApplet/completeInfo.html',
    H5_startVote:'https://malltest.rjfittime.com/fitcampApplet/startDetail.html?applyId={applyId}',
    H5_abilityReport:'https://malltest.rjfittime.com/fitcampApplet/abilityReport.html?applyId={applyId}',
    H5_weeklyByWeek : 'https://malltest.rjfittime.com/fitcampApplet/weeklyByWeek.html?applyId={applyId}&week={week}'
  },
  dev : {
    debug : 1,
    loginUrl: 'https://oauthtest.rjft.net/api/v2/wxappSignIn',
    registerUrl: 'https://oauthtest.rjft.net/api/v2/wxappSignUp',
    requestVerifyCode: 'https://oauthtest.rjft.net/api/v2/sms/requestVerifyCode',
    userInfoUrl: 'https://oauthtest.rjft.net/api/v2/User',
    bindPhoneUrl: 'https://oauthtest.rjft.net/api/v2/sms/bindPhone',
    currentApplyUrl: 'https://malldev.rjfittime.com/fitcamp/apply/currentApply.json',
    currentCourseUrl: 'https://malldev.rjfittime.com/customCourse/currentCourse.json',
    courseWorkoutUrl:'https://coursetest.rjft.net/training/course/{COURSEID}/workout/{WOKROUTID}',
    userDiet:'https://malldev.rjfittime.com/fitcamp/apply/userDiet.json',
    mergeAcount:'https://malldev.rjfittime.com/weixin/migrate.json',
    transferAcount:'https://malldev.rjfittime.com/weixin/transfer.json',
    singlePlan: 'https://coursetest.rjft.net/course/{id}/recursive',
    checkinStatus:'https://malldev.rjfittime.com/wxapp/fitcamp/checkinStatus.json',
    checkinRecords:'https://malldev.rjfittime.com/wxapp/fitcamp/checkinRecords.json',
    checkin:'https://malldev.rjfittime.com/wxapp/fitcamp/checkin.json',
    checkinNew:'https://malldev.rjfittime.com/fitcampApplet/checkIn/checkin.json',
    recipes:'https://malldev.rjfittime.com/wxapp/fitcamp/checkinRecipes.json',
    uploadImage:'https://malldev.rjfittime.com/uploadImage.html',
    uploadImageQiNiu:'https://upload.qiniup.com',
    queryCurrentTrain:'https://malldev.rjfittime.com/fitcampApplet/queryCurrentTrain.json',
    queryModuleTrainList:'https://malldev.rjfittime.com/fitcampApplet/queryModuleTrainList.json',
    queryTrainHistory:'https://malldev.rjfittime.com/fitcampApplet/queryTrainHistory.json',
    config:'https://malldev.rjfittime.com/wxapp/config.json',
    uploadToken:'https://malldev.rjfittime.com/uploadToken.json',
    errorLog:'https://log.rjft.net',
    scoreList:'https://malldev.rjfittime.com/fitcampApplet/scoreList.json',
    exchangeScore:'https://malldev.rjfittime.com/fitcampApplet/exchangeScore.json',
    wechatStep:'https://malldev.rjfittime.com/fitcampApplet/wechatStep.json',
    getUserMobile : 'https://oauthtest.rjft.net/api/v2/User',
    targetDetail:'https://malldev.rjfittime.com/fitcampApplet/targetDetail.json',
    queryTrain:'https://malldev.rjfittime.com/fitcampApplet/checkIn/queryTrain.json',
    queryRecipe: 'https://malldev.rjfittime.com/fitcampApplet/checkIn/queryRecipe.json',
    reportList: 'https://malldev.rjfittime.com/wxapp/fitcamp/weekList.json',
    H5_testpage: 'https://malldev.rjfittime.com/customCourse/common.html',
    H5_bodydata:'https://malldev.rjfittime.com/bodyData/commonInput.html',
    H5_starList:'https://malldev.rjfittime.com/fitcampApplet/startList.html?applyId={applyId}',
    H5_startUpload: 'https://malldev.rjfittime.com/fitcampApplet/completeInfo.html',
    H5_startVote:'https://malldev.rjfittime.com/fitcampApplet/startDetail.html?applyId={applyId}',
    H5_abilityReport:'https://malldev.rjfittime.com/fitcampApplet/abilityReport.html?applyId={applyId}',
    H5_weeklyByWeek : 'https://malldev.rjfittime.com/fitcampApplet/weeklyByWeek.html?applyId={applyId}&week={week}'
  },
  online : {
    debug: false,
    loginUrl: 'https://oauth.rjft.net/api/v2/wxappSignIn',
    registerUrl: 'https://oauth.rjft.net/api/v2/wxappSignUp',
    requestVerifyCode: 'https://oauth.rjft.net/api/v2/sms/requestVerifyCode',
    userInfoUrl: 'https://oauth.rjft.net/api/v2/User',
    bindPhoneUrl: 'https://oauth.rjft.net/api/v2/sms/bindPhone',
    currentApplyUrl: 'https://mall.rjfittime.com/fitcamp/apply/currentApply.json',
    currentCourseUrl: 'https://mall.rjfittime.com/customCourse/currentCourse.json',
    courseWorkoutUrl: 'https://course.rjft.net/training/course/{COURSEID}/workout/{WOKROUTID}',
    userDiet: 'https://mall.rjfittime.com/fitcamp/apply/userDiet.json',
    mergeAcount: 'https://mall.rjfittime.com/weixin/migrate.json',
    transferAcount: 'https://mall.rjfittime.com/weixin/transfer.json',
    singlePlan: 'https://course.rjft.net/course/{id}/recursive',
    checkinStatus: 'https://mall.rjfittime.com/wxapp/fitcamp/checkinStatus.json',
    checkinRecords: 'https://mall.rjfittime.com/wxapp/fitcamp/checkinRecords.json',
    checkin:'https://mall.rjfittime.com/wxapp/fitcamp/checkin.json',
    checkinNew:'https://mall.rjfittime.com/fitcampApplet/checkIn/checkin.json',
    recipes: 'https://mall.rjfittime.com/wxapp/fitcamp/checkinRecipes.json',
    uploadImage: 'https://mall.rjfittime.com/uploadImage.html',
    uploadImageQiNiu: 'https://upload.qiniup.com',
    queryCurrentTrain: 'https://mall.rjfittime.com/fitcampApplet/queryCurrentTrain.json',
    queryModuleTrainList: 'https://mall.rjfittime.com/fitcampApplet/queryModuleTrainList.json',
    queryTrainHistory: 'https://mall.rjfittime.com/fitcampApplet/queryTrainHistory.json',
    config: 'https://mall.rjfittime.com/wxapp/config.json',
    uploadToken: 'https://mall.rjfittime.com/uploadToken.json',
    errorLog: 'https://log.rjft.net',
    scoreList: 'https://mall.rjfittime.com/fitcampApplet/scoreList.json',
    exchangeScore: 'https://mall.rjfittime.com/fitcampApplet/exchangeScore.json',
    wechatStep: 'https://mall.rjfittime.com/fitcampApplet/wechatStep.json',
    getUserMobile: 'https://oauth.rjft.net/api/v2/User',
    targetDetail: 'https://mall.rjfittime.com/fitcampApplet/targetDetail.json',
    queryTrain: 'https://mall.rjfittime.com/fitcampApplet/checkIn/queryTrain.json',
    queryRecipe: 'https://mall.rjfittime.com/fitcampApplet/checkIn/queryRecipe.json',
    reportList: 'https://mall.rjfittime.com/wxapp/fitcamp/weekList.json',
    H5_testpage: 'https://mall.rjfittime.com/customCourse/common.html',
    H5_bodydata:'https://mall.rjfittime.com/bodyData/commonInput.html',
    H5_starList:'https://mall.rjfittime.com/fitcampApplet/startList.html?applyId={applyId}',
    H5_startUpload: 'https://mall.rjfittime.com/fitcampApplet/completeInfo.html',
    H5_startVote:'https://mall.rjfittime.com/fitcampApplet/startDetail.html?applyId={applyId}',
    H5_abilityReport:'https://mall.rjfittime.com/fitcampApplet/abilityReport.html?applyId={applyId}',
    H5_weeklyByWeek : 'https://mall.rjfittime.com/fitcampApplet/weeklyByWeek.html?applyId={applyId}&week={week}'
  }
}['online'];
