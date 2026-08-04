/**************************************************
 * 名称：Dounai 自动签到
 * 作者：tanwg21 & ChatGPT
 * 版本：2.1.0
 * 更新时间：2026-08-04
 * 平台：Loon
 *
 * 功能：
 *  1. 自动签到
 *  2. 自动解析签到结果
 *  3. 输出详细日志
 *  4. 通知签到状态
 **************************************************/

//==================================================
// 配置
//==================================================

const CONFIG = {

    COOKIE_KEY: "dounai_cookie",

    CHECKIN_URL: "https://dounai.pro/user/checkin",

    DEBUG: true        // 是否打印服务器完整返回

};


//==================================================
// 日志
//==================================================

const startTime = Date.now();

function log(msg) {
    console.log("[Dounai] " + msg);
}

function line() {
    log("----------------------------------------");
}

function finish() {

    const cost = Date.now() - startTime;

    line();

    log("运行耗时：" + cost + " ms");

    log("========== 执行结束 ==========");

    $done();

}


//==================================================
// 开始
//==================================================

log("========== 开始执行 ==========");

line();


//==================================================
// 读取 Cookie
//==================================================

log("步骤①：读取Cookie");

const cookie = $persistentStore.read(CONFIG.COOKIE_KEY);

if (!cookie) {

    log("❌ 未找到Cookie");

    $notification.post(
        "❌ Dounai",
        "Cookie不存在",
        "请重新登录获取Cookie"
    );

    finish();

    return;
}

log("✅ Cookie读取成功");


//==================================================
// 发送请求
//==================================================

line();

log("步骤②：发送签到请求");

$httpClient.post({

    url: CONFIG.CHECKIN_URL,

    headers: {

        Cookie: cookie,

        Origin: "https://dounai.pro",

        Referer: "https://dounai.pro/user/panel",

        Accept: "application/json, text/javascript, */*; q=0.01",

        "X-Requested-With": "XMLHttpRequest",

        "User-Agent": "Mozilla/5.0"

    }

}, function(error, response, data) {


//==================================================
// 网络异常
//==================================================

    if (error) {

        log("❌ 网络错误");

        log(error);

        $notification.post(
            "❌ Dounai",
            "网络错误",
            error
        );

        finish();

        return;
    }

    log("✅ HTTP状态：" + response.status);


//==================================================
// DEBUG
//==================================================

    if (CONFIG.DEBUG) {

        line();

        log("服务器返回：");

        console.log(data);

    }


//==================================================
// JSON解析
//==================================================

    line();

    log("步骤③：解析返回结果");

    let obj;

    try {

        obj = JSON.parse(data);

        log("✅ JSON解析成功");

    } catch(e) {

        log("❌ JSON解析失败");

        $notification.post(
            "❌ Dounai",
            "JSON解析失败",
            data
        );

        finish();

        return;
    }


//==================================================
// 判断结果
//==================================================

    line();

    log("步骤④：判断签到状态");

    const msg = obj.msg || "";

    if (
        obj.ret == 1 &&
        !msg.includes("刷新") &&
        !msg.includes("失败") &&
        !msg.includes("错误")
    ) {

        log("🎉 签到成功");

        log(msg);

        $notification.post(
            "✅ Dounai",
            "签到成功",
            msg
        );

    }

    else if (
        msg.includes("续过命") ||
        msg.includes("已签到")
    ) {

        log("ℹ️ 今天已经签到");

        log(msg);

        $notification.post(
            "ℹ️ Dounai",
            "今天已签到",
            msg
        );

    }

    else {

        log("❌ 签到失败");

        log(msg || "未知错误");

        $notification.post(
            "❌ Dounai",
            "签到失败",
            msg || "未知错误"
        );

    }


//==================================================
// 完成
//==================================================

    finish();

});
