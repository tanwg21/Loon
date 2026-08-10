/**************************************************
 * 名称：Dounai 自动签到 (自动刷新 Token 版)
 * 作者：tanwg21
 * 版本：3.0.0
 * 说明：先 GET 访问 panel 刷新 CSRF/Session，再 POST 签到
 **************************************************/

const COOKIE_KEY = "dounai_cookie";
const BASE_URL = "https://14.137.237.0:1443";

if (typeof $request !== 'undefined') {
    getCookie();
} else {
    autoRefreshAndCheckIn();
}

/**
 * 抓取浏览器 Cookie
 */
function getCookie() {
    if ($request && $request.headers) {
        const cookie = $request.headers['Cookie'] || $request.headers['cookie'];
        if (cookie) {
            $persistentStore.write(cookie, COOKIE_KEY);
            $notification.post("Dounai", "Cookie 获取成功 🎉", "已更新初始登录凭证");
        }
    }
    $done({});
}

/**
 * 核心逻辑：先 GET 刷新页面获取最新 Session/Token，再 POST 签到
 */
function autoRefreshAndCheckIn() {
    let savedCookie = $persistentStore.read(COOKIE_KEY);

    if (!savedCookie) {
        $notification.post("Dounai 签到", "⚠️ Cookie 不存在", "请先在浏览器登录面板获取初始 Cookie");
        return $done();
    }

    savedCookie = savedCookie.trim().replace(/;$/, "");

    console.log("========== [1/2] 正在模拟刷新页面获取最新 Token ==========");

    // Step 1: 先 GET 访问 panel 页面“刷新”Token
    const getOptions = {
        url: `${BASE_URL}/user/panel`,
        headers: {
            "Host": "14.137.237.0:1443",
            "Cookie": savedCookie,
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
    };

    $httpClient.get(getOptions, (err, resp, data) => {
        if (err) {
            console.log("GET 刷新页面失败: " + JSON.stringify(err));
            $notification.post("Dounai 签到", "❌ 刷新页面网络异常", String(err));
            return $done();
        }

        // 提取服务器返回的全新 Set-Cookie（如果有）
        let activeCookie = savedCookie;
        if (resp && resp.headers) {
            const setCookie = resp.headers['Set-Cookie'] || resp.headers['set-cookie'];
            if (setCookie) {
                console.log("[Dounai] 收到服务端更新的 Set-Cookie");
                activeCookie = mergeCookies(savedCookie, setCookie);
                // 同步更新本地存储，保持 Cookie 永久新鲜
                $persistentStore.write(activeCookie, COOKIE_KEY);
            }
        }

        console.log("========== [2/2] 正在发送正式签到请求 ==========");
        executeCheckIn(activeCookie);
    });
}

/**
 * 执行正式 POST 签到
 */
function executeCheckIn(cookie) {
    const postOptions = {
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

    $httpClient.post(postOptions, (err, resp, data) => {
        if (err) {
            console.log("签到请求失败: " + JSON.stringify(err));
            $notification.post("Dounai 签到", "❌ 网络错误", String(err));
            return $done();
        }

        const status = resp ? (resp.status || resp.statusCode) : 0;
        console.log(`HTTP Status: ${status}`);
        console.log(`Response Data: ${data}`);

        if (status === 401 || status === 403) {
            $notification.post("Dounai 签到", "⚠️ 登录已过期", "请在浏览器重新登录面板");
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
            if (data && (data.includes("已签到") || data.includes("续过命"))) {
                $notification.post("ℹ️ Dounai", "今天已签到", "文本判定完成");
            } else {
                $notification.post("Dounai", "❌ 解析失败", data ? data.slice(0, 100) : "无返回内容");
            }
        }

        $done();
    });
}

/**
 * Cookie 合并工具函数
 */
function mergeCookies(oldCookie, newSetCookie) {
    const cookieMap = new Map();

    // 解析旧 Cookie
    oldCookie.split(';').forEach(item => {
        const [k, v] = item.split('=').map(s => s && s.trim());
        if (k && v) cookieMap.set(k, v);
    });

    // 解析并覆盖 Set-Cookie
    const newItems = Array.isArray(newSetCookie) ? newSetCookie : [newSetCookie];
    newItems.forEach(item => {
        const firstPart = item.split(';')[0];
        const [k, v] = firstPart.split('=').map(s => s && s.trim());
        if (k && v && !['path', 'domain', 'expires', 'max-age', 'secure', 'httponly'].includes(k.toLowerCase())) {
            cookieMap.set(k, v);
        }
    });

    return Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}
