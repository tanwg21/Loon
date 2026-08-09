/**************************************************
 * 名称：Dounai 自动签到 (Loon / Quantumult X)
 * 作者：tanwg21
 * 版本：2.3.0
 **************************************************/

const COOKIE_KEY = "dounai_cookie";

// 判断当前触发环境：抓包拦截还是定时运行
if (typeof $request !== 'undefined') {
    getCookie();
} else {
    checkIn();
}

/**
 * 1. 自动截获并持久化保存 Cookie
 */
function getCookie() {
    if ($request && $request.headers) {
        const cookie = $request.headers['Cookie'] || $request.headers['cookie'];
        if (cookie) {
            $persistentStore.write(cookie, COOKIE_KEY);
            $notification.post("Dounai", "Cookie 获取成功 🎉", "已自动更新持久化凭证");
            console.log("[Dounai] 新 Cookie 已写入: " + cookie);
        } else {
            $notification.post("Dounai", "Cookie 获取失败 ❌", "请求头中未包含 Cookie 字段");
        }
    }
    $done({});
}

/**
 * 2. 执行自动签到
 */
function checkIn() {
    const cookie = $persistentStore.read(COOKIE_KEY);

    if (!cookie) {
        $notification.post("Dounai 签到", "⚠️ Cookie 不存在", "请在浏览器登录 dounai.pro/user/panel 获取");
        return $done();
    }

    console.log("========== Dounai Checkin ==========");
    console.log("Cookie: " + cookie);

    const options = {
        url: "https://dounai.pro/user/checkin",
        headers: {
            "Cookie": cookie,
            "Origin": "https://dounai.pro",
            "Referer": "https://dounai.pro/user/panel",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
        }
    };

    $httpClient.post(options, (err, resp, data) => {
        if (err) {
            console.log("网络请求异常: " + JSON.stringify(err));
            $notification.post("Dounai 签到", "❌ 网络错误", String(err));
            return $done();
        }

        const status = resp ? (resp.status || resp.statusCode) : 0;
        console.log(`HTTP Status: ${status}`);
        console.log(`Response Data: ${data}`);

        // HTTP 状态码非 200 处理
        if (status === 401 || status === 403) {
            $notification.post("Dounai 签到", "⚠️ Cookie 已过期", "登录凭证失效，请重新登录网页获取");
            return $done();
        }

        if (status !== 200) {
            $notification.post("Dounai 签到", `❌ 服务器异常 [${status}]`, "响应状态码不为 200");
            return $done();
        }

        try {
            const obj = JSON.parse(data);
            const msg = obj.msg || obj.message || "";
            const isSuccess = obj.ret == 1 || obj.code == 200 || obj.status === "success";

            if (isSuccess && (msg.includes("获得了") || msg.includes("成功"))) {
                $notification.post("✅ Dounai", "签到成功", msg);
            } else if (msg.includes("已签到") || msg.includes("续过命") || msg.includes("重复")) {
                $notification.post("ℹ️ Dounai", "今天已签到", msg);
            } else {
                $notification.post("❌ Dounai", "签到失败", msg || "未知错误");
            }

        } catch (e) {
            console.log("JSON 解析异常: " + e.message);
            // 容错处理：部分站点直接返回纯文本提示
            if (data && (data.includes("已签到") || data.includes("续过命"))) {
                $notification.post("ℹ️ Dounai", "今天已签到", "文本判定完成");
            } else {
                $notification.post("Dounai", "❌ 解析失败", data ? data.slice(0, 100) : "无返回内容");
            }
        }

        $done();
    });
}
