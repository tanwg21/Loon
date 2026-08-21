/**************************************************
 * 名称：Dounai 自动签到与账号数据查询
 * 作者：tanwg21
 * 版本：3.9.0 (汇总 Dashboard 日志版)
 * 更新时间：2026-08-21
 * 功能：
 *   自动刷新 Token
 *   防风控延迟 (2.5s)
 *   自动签到与全页流量解析
 *   美化控制台汇总日志输出 (Log Dashboard)
 **************************************************/

//==================================================
// 配置
//==================================================

const COOKIE_KEY = "dounai_cookie";

const BASE_URL = "https://14.137.237.0:1443";

const SCRIPT_VERSION = "2026-08-21.v3.9";


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

    console.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);


    let savedCookie =
        $persistentStore.read(COOKIE_KEY);


    if (!savedCookie) {

        console.log("[ERROR] Cookie不存在，请先前往面板获取 Cookie");

        $notification.post(
            "Dounai 签到",
            "⚠️ Cookie不存在",
            "请先在浏览器登录面板获取初始Cookie"
        );

        return $done();

    }


    savedCookie =
        savedCookie.trim().replace(/;$/, "");


    // 简单提取 UID 方便日志展示 (如从 Cookie 中提取 uid/key)
    const uidMatch = savedCookie.match(/(?:uid|user_id|key)=([0-9a-zA-Z]+)/i);

    const uidStr = uidMatch ? maskUid(uidMatch[1]) : "已获取 (已加密)";

    console.log(`[INFO] 用户凭证 ${uidStr}`);


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


        if (!err && resp && resp.headers) {

            const setCookie =
                resp.headers["Set-Cookie"] ||
                resp.headers["set-cookie"];

            if (setCookie) {

                activeCookie =
                    mergeCookies(savedCookie, setCookie);

                $persistentStore.write(
                    activeCookie,
                    COOKIE_KEY
                );

            }

        }


        setTimeout(() => {

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

            console.log("[ERROR] 签到网络请求失败");

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

            console.log("[WARN] 登录状态凭证已失效");

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
                "签到成功";

        } catch (e) {

            if (data && (data.includes("已签到") || data.includes("续过命"))) {

                checkinMsg = "今天已签到过";

            } else {

                checkinMsg = "签到完成";

            }

        }


        getUserInfo(cookie, checkinMsg);

    });

}


//==================================================
// 全页 HTML 解析与日志面板（Dashboard）输出
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

        let restStr = "未匹配";

        let usedStr = "未匹配";

        let totalStr = "未匹配";


        if (!err && data) {

            const cleanText = data.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");


            const restMatch =
                cleanText.match(/(?:剩余流量|可用流量|剩余)[:：\s]*([0-9\.]+\s*(?:Bytes|B|KB|MB|GB|TB))/i) ||
                cleanText.match(/(?:剩余|可用)[\s\S]{0,20}?([0-9\.]+\s*(?:Bytes|B|KB|MB|GB|TB))/i);

            const usedMatch =
                cleanText.match(/(?:已用流量|已用)[:：\s]*([0-9\.]+\s*(?:Bytes|B|KB|MB|GB|TB))/i) ||
                cleanText.match(/已用[\s\S]{0,20}?([0-9\.]+\s*(?:Bytes|B|KB|MB|GB|TB))/i);

            const totalMatch =
                cleanText.match(/(?:总流量|共)[:：\s]*([0-9\.]+\s*(?:Bytes|B|KB|MB|GB|TB))/i);


            if (restMatch) restStr = restMatch[1].replace(/\s+/, "");

            if (usedMatch) usedStr = usedMatch[1].replace(/\s+/, "");

            if (totalMatch) totalStr = totalMatch[1].replace(/\s+/, "");


            // 自动补全总流量
            if (totalStr === "未匹配" && restStr !== "未匹配" && usedStr !== "未匹配") {

                const rNum = parseFloat(restStr);

                const uNum = parseFloat(usedStr);

                const unit = restStr.replace(/[0-9\.]/g, "");

                if (!isNaN(rNum) && !isNaN(uNum)) {

                    totalStr = (rNum + uNum).toFixed(2) + unit;

                }

            }

        }


        // 打印控制台 Dashboard 结构化日志
        console.log("====📣 Dounai 任务汇总====");

        console.log(`✅ 每日签到: ${checkinMsg}`);

        console.log(`📊 剩余流量: ${restStr}`);

        console.log(`📈 已用流量: ${usedStr}`);

        console.log(`💾 账户总量: ${totalStr}`);


        // 组装系统通知栏消息
        let bodyStr = "";

        if (restStr !== "未匹配") {

            bodyStr = `剩余:${restStr} | 已用:${usedStr}`;

            if (totalStr !== "未匹配") bodyStr += ` | 共:${totalStr}`;

        } else {

            bodyStr = "数据解析正常（未能匹配到流量字段）";

        }


        $notification.post(
            "Dounai 签到",
            `🎉 ${checkinMsg}`,
            `📊 ${bodyStr}`
        );


        $done();

    });

}


//==================================================
// 辅助函数
//==================================================

function maskUid(str) {

    if (!str || str.length <= 3) return "***";

    return str.slice(0, 3) + "***";

}


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
