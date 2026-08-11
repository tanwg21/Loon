/**************************************************
 * 名称：Dounai 自动签到
 * 作者：tanwg21
 * 版本：3.1.0
 * 更新时间：2026-08-11
 * 功能：
 *   自动刷新页面 Token
 *   网络异常降级签到
 *   自动合并持久化 Cookie
 **************************************************/

//==================================================
// 配置
//==================================================

const COOKIE_KEY = "dounai_cookie";

const BASE_URL = "https://14.137.237.0:1443";


//==================================================
// 环境选择
//==================================================

if (typeof $request !== "undefined") {

    getCookie();

} else {

    autoRefreshAndCheckIn();

}


//==================================================
// 抓取Cookie
//==================================================

function getCookie() {

    if ($request && $request.headers) {

        const cookie =
            $request.headers["Cookie"] ||
            $request.headers["cookie"];

        if (cookie) {

            $persistentStore.write(
                cookie,
                COOKIE_KEY
            );

            $notification.post(
                "Dounai",
                "Cookie获取成功 🎉",
                "已更新初始登录凭证"
            );

        }

    }

    $done({});

}


//==================================================
// 自动刷新 Token 与签到
//==================================================

function autoRefreshAndCheckIn() {

    let savedCookie =
        $persistentStore.read(COOKIE_KEY);


    if (!savedCookie) {

        $notification.post(
            "Dounai 签到",
            "⚠️ Cookie不存在",
            "请先在浏览器登录面板获取初始Cookie"
        );

        return $done();

    }


    savedCookie =
        savedCookie.trim().replace(/;$/, "");


    console.log("========== [1/2] 刷新页面获取最新Token ==========");


    const getOptions = {
        url: `${BASE_URL}/user/panel`,
        headers: {
            "Host": "14.137.237.0:1443",
            "Cookie": savedCookie,
            "Connection": "keep-alive",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh-Hans;q=0.9"
        }
    };


    $httpClient.get(getOptions, (err, resp, data) => {

        let activeCookie = savedCookie;


        if (err) {

            console.log("⚠️ GET刷新失败，尝试直接签到: " + JSON.stringify(err));

        } else {

            console.log("GET Status: " + (resp ? resp.status : "OK"));

            if (resp && resp.headers) {

                const setCookie =
                    resp.headers["Set-Cookie"] ||
                    resp.headers["set-cookie"];

                if (setCookie) {

                    console.log("[Dounai] 收到服务端更新Set-Cookie");

                    activeCookie =
                        mergeCookies(savedCookie, setCookie);

                    $persistentStore.write(
                        activeCookie,
                        COOKIE_KEY
                    );

                }

            }

        }


        console.log("========== [2/2] 发送正式签到请求 ==========");

        executeCheckIn(activeCookie);

    });

}


//==================================================
// 执行签到
//==================================================

function executeCheckIn(cookie) {

    const postOptions = {
        url: `${BASE_URL}/user/checkin`,
        headers: {
            "Host": "14.137.237.0:1443",
            "Cookie": cookie,
            "Origin": BASE_URL,
            "Referer": `${BASE_URL}/user/panel`,
            "Connection": "keep-alive",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
        }
    };


    $httpClient.post(postOptions, (err, resp, data) => {

        if (err) {

            console.log("签到请求失败: " + JSON.stringify(err));

            $notification.post(
                "Dounai 签到",
                "❌ 网络错误",
                String(err)
            );

            return $done();

        }


        const status =
            resp ? (resp.status || resp.statusCode) : 0;

        console.log(`HTTP Status: ${status}`);
        console.log(`Response Data: ${data}`);


        if (status === 401 || status === 403) {

            $notification.post(
                "Dounai 签到",
                "⚠️ 登录已过期",
                "请在浏览器重新登录面板"
            );

            return $done();

        }


        try {

            const obj = JSON.parse(data);

            const msg =
                obj.msg ||
                obj.message ||
                "";

            const isSuccess =
                obj.ret == 1 ||
                obj.code == 200 ||
                obj.status === "success";


            if (isSuccess && (msg.includes("获得了") || msg.includes("成功"))) {

                $notification.post(
                    "✅ Dounai",
                    "签到成功",
                    msg
                );

            } else if (
                msg.includes("已签到") ||
                msg.includes("续过命") ||
                msg.includes("重复")
            ) {

                $notification.post(
                    "ℹ️ Dounai",
                    "今天已签到",
                    msg
                );

            } else {

                $notification.post(
                    "❌ Dounai",
                    "签到失败",
                    msg || "未知错误"
                );

            }

        } catch (e) {

            if (data && (data.includes("已签到") || data.includes("续过命"))) {

                $notification.post(
                    "ℹ️ Dounai",
                    "今天已签到",
                    "文本判定完成"
                );

            } else {

                $notification.post(
                    "Dounai",
                    "❌ 解析失败",
                    data ? data.slice(0, 100) : "无返回内容"
                );

            }

        }


        $done();

    });

}


//==================================================
// Cookie合并函数
//==================================================

function mergeCookies(oldCookie, newSetCookie) {

    const cookieMap = new Map();


    oldCookie.split(";").forEach(item => {

        const [k, v] =
            item.split("=").map(s => s && s.trim());

        if (k && v) cookieMap.set(k, v);

    });


    const newItems =
        Array.isArray(newSetCookie) ? newSetCookie : [newSetCookie];


    newItems.forEach(item => {

        const firstPart = item.split(";")[0];

        const [k, v] =
            firstPart.split("=").map(s => s && s.trim());

        if (
            k &&
            v &&
            !["path", "domain", "expires", "max-age", "secure", "httponly"].includes(k.toLowerCase())
        ) {

            cookieMap.set(k, v);

        }

    });


    return Array.from(cookieMap.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");

}
