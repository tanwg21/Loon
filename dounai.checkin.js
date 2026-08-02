/**************************************************
 * 名称：Dounai 自动签到
 * 作者：tanwg21
 * 版本：1.0.0
 * 更新时间：2026-08-02
 * 功能：
 *  1. 自动签到
 *  2. 解析签到结果
 *  3. 通知签到状态
 **************************************************/

//==================================================
// 配置
//==================================================

const COOKIE_KEY = "dounai_cookie";
const CHECKIN_URL = "https://dounai.pro/user/checkin";

//==================================================
// 日志
//==================================================

function log(msg) {
    console.log("[Dounai] " + msg);
}

log("========== 开始执行 ==========");

//==================================================
// 读取 Cookie
//==================================================

const cookie = $persistentStore.read(COOKIE_KEY);

if (!cookie) {

    log("未找到 Cookie");

    $notification.post(
        "❌ Dounai",
        "Cookie不存在",
        "请重新获取 Cookie"
    );

    $done();
}

log("Cookie读取成功");

//==================================================
// 发起签到请求
//==================================================

$httpClient.post({

    url: CHECKIN_URL,

    headers: {
        Cookie: cookie,
        Origin: "https://dounai.pro",
        Referer: "https://dounai.pro/user/panel",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0"
    }

}, function (error, response, data) {

//==================================================
// 网络错误处理
//==================================================

    if (error) {

        log("网络请求失败：" + error);

        $notification.post(
            "❌ Dounai",
            "网络错误",
            error
        );

        return $done();
    }

    log("HTTP：" + response.status);

//==================================================
// 解析返回数据
//==================================================

    try {

        const obj = JSON.parse(data);

        log("服务器返回：" + obj.msg);

//==================================================
// 判断签到结果
//==================================================

        if (obj.ret == 1) {

            log("签到成功");

            $notification.post(
                "✅ Dounai",
                "签到成功",
                obj.msg
            );

        } else if (obj.msg && obj.msg.includes("续过命")) {

            log("今天已经签到");

            $notification.post(
                "ℹ️ Dounai",
                "今天已签到",
                obj.msg
            );

        } else {

            log("签到失败");

            $notification.post(
                "❌ Dounai",
                "签到失败",
                obj.msg || data
            );

        }

    } catch (e) {

//==================================================
// JSON解析异常
//==================================================

        log("JSON解析失败：" + e);

        $notification.post(
            "❌ Dounai",
            "解析失败",
            data
        );

    }

//==================================================
// 结束
//==================================================

    log("========== 执行结束 ==========");

    $done();

});
