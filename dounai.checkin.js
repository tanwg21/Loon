/**************************************************
 * 名称：Dounai 自动签到 (Loon / Quantumult X)
 * 作者：tanwg21
 * 版本：2.6.0
 * 修复：精准匹配 SSPANEL 校验逻辑，解决 CSRF 误判
 **************************************************/

const COOKIE_KEY = "dounai_cookie";
const BASE_URL = "https://14.137.237.0:1443";

if (typeof $request !== 'undefined') {
    getCookie();
} else {
    checkIn();
}

function getCookie() {
    if ($request && $request.headers) {
        const cookie = $request.headers['Cookie'] || $request.headers['cookie'];
        if (cookie) {
            $persistentStore.write(cookie, COOKIE_KEY);
            $notification.post("Dounai", "Cookie 获取成功 🎉", "已自动更新持久化凭证");
        }
    }
    $done({});
}

function checkIn() {
    let cookie = $persistentStore.read(COOKIE_KEY);

    if (!cookie) {
        $notification.post("Dounai 签到", "⚠️ Cookie 不存在", "请在浏览器登录面板获取");
        return $done();
    }

    // 格式化 Cookie：去除前后空格及末尾多余的分号
    cookie = cookie.trim().replace(/;$/, "");

    console.log("========== Dounai Checkin ==========");
    console.log("Cookie: " + cookie);

    const options = {
        url: `${BASE_URL}/user/checkin`,
        headers: {
            "Host": "14.137.237.0:1443",
            "Cookie": cookie,
            "Origin": BASE_URL,
            "Referer": `${BASE_URL}/user/panel`,
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
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

            if (msg.includes("刷新页面")) {
                $notification.post("❌ Dounai 签到", "CSRF 校验拦截", "请在 Safari 中直接刷新 /user/panel 重新抓取完整凭证");
            } else if (isSuccess && (msg.includes("获得了") || msg.includes("成功"))) {
                $notification.post("✅ Dounai", "签到成功", msg);
            } else if (msg.includes("已签到") || msg.includes("续过命") || msg.includes("重复")) {
                $notification.post("ℹ️ Dounai", "今天已签到", msg);
            } else {
                $notification.post("❌ Dounai", "签到失败", msg || "未知错误");
            }

        } catch (e) {
            console.log("JSON 解析异常: " + e.message);
            if (data && (data.includes("已签到") || data.includes("续过命"))) {
                $notification.post("ℹ️ Dounai", "今天已签到", "文本判定完成");
            } else {
                $notification.post("Dounai", "❌ 解析失败", data ? data.slice(0, 100) : "无返回内容");
            }
        }

        $done();
    });
}
