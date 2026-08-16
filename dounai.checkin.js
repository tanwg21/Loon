/**************************************************
 * 名称：Dounai 自动签到与账号数据查询
 * 作者：tanwg21
 * 版本：3.4.0
 * 更新时间：2026-08-16
 * 功能：
 *   自动刷新页面 Token
 *   防风控延迟 (2.5s)
 *   自动签到并精准解析面板页面中的流量/到期数据
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


    console.log("========== [1/3] 刷新页面获取最新Token ==========");


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


        console.log("⏳ 防风控等待 2.5 秒后发送签到...");


        setTimeout(() => {

            console.log("========== [2/3] 发送正式签到请求 ==========");

            executeCheckIn(activeCookie);

        }, 2500);

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

        let checkinMsg = "";

        if (err) {

            console.log("签到请求失败: " + JSON.stringify(err));

            $notification.post(
                "Dounai 签到",
                "❌ 网络错误",
                "请检查代理节点连通性"
            );

            return $done();

        }


        const status =
            resp ? (resp.status || resp.statusCode) : 0;


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

            checkinMsg =
                obj.msg ||
                obj.message ||
                "签到完成";

        } catch (e) {

            if (data && (data.includes("已签到") || data.includes("续过命"))) {

                checkinMsg = "今天已经签到过了哦";

            } else {

                checkinMsg = "签到响应解析完成";

            }

        }


        console.log("========== [3/3] 正在获取详细账号流量状态 ==========");

        getUserInfo(cookie, checkinMsg);

    });

}


//==================================================
// 解析面板 HTML 页面获取流量数据
//==================================================

function getUserInfo(cookie, checkinMsg) {

    const getPanelOptions = {
        url: `${BASE_URL}/user/panel`,
        headers: {
            "Host": "14.137.237.0:1443",
            "Cookie": cookie,
            "Connection": "keep-alive",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
    };


    $httpClient.get(getPanelOptions, (err, resp, data) => {

        let trafficInfoStr = "";


        if (!err && data) {

            // 正则匹配面板中的流量字段
            const restMatch =
                data.match(/剩余流量[:：\s]*([0-9\.]+\s*[KMGT]?B)/i) ||
                data.match(/可用流量[:：\s]*([0-9\.]+\s*[KMGT]?B)/i);

            const usedMatch =
                data.match(/已用流量[:：\s]*([0-9\.]+\s*[KMGT]?B)/i);

            const totalMatch =
                data.match(/总流量[:：\s]*([0-9\.]+\s*[KMGT]?B)/i);

            const expireMatch =
                data.match(/等级到期[:：\s]*([0-9]{4}-[0-9]{2}-[0-9]{2}[^<]*)/i) ||
                data.match(/到期时间[:：\s]*([0-9]{4}-[0-9]{2}-[0-9]{2}[^<]*)/i);


            let restTraffic =
                restMatch ? restMatch[1].trim() : "";

            let usedTraffic =
                usedMatch ? usedMatch[1].trim() : "";

            let totalTraffic =
                totalMatch ? totalMatch[1].trim() : "";

            let expireTime =
                expireMatch ? expireMatch[1].trim() : "";


            if (restTraffic || usedTraffic) {

                trafficInfoStr =
                    `\n📊 剩余: ${restTraffic || "未知"}` +
                    (totalTraffic ? ` / 共 ${totalTraffic}` : "") +
                    (usedTraffic ? ` (已用: ${usedTraffic})` : "") +
                    (expireTime ? `\n⏳ 到期: ${expireTime}` : "");

            }

        }


        // 组合最终通知文本
        const title = "✅ Dounai 自动签到";

        const subtitle = checkinMsg;

        const body =
            trafficInfoStr ?
            `🎉 状态: ${checkinMsg}${trafficInfoStr}` :
            `🎉 状态: ${checkinMsg}\n💡 未能从页面匹配到流量结构`;


        $notification.post(title, subtitle, body);


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
