/**************************************************
 * 名称：Dounai Cookie获取
 * 作者：tanwg21
 * 版本：1.1.0
 * 更新时间：2026-08-02
 * 功能：
 *   自动获取登录Cookie
 *   自动过滤无效Cookie
 *   Cookie变化检测
 **************************************************/

//==================================================
// 配置
//==================================================

const COOKIE_KEY = "dounai_cookie";


//==================================================
// 获取Cookie
//==================================================

const newCookie =
    $request.headers["Cookie"] ||
    $request.headers["cookie"];


if (!newCookie) {

    console.log("[Dounai] 无Cookie");

    $done({});
}


//==================================================
// 判断是否登录
//==================================================

if (
    !newCookie.includes("uid=") ||
    !newCookie.includes("key=") ||
    !newCookie.includes("email=")
) {

    console.log("[Dounai] 非登录状态");

    $done({});
}


//==================================================
// Cookie标准化
// 防止顺序变化导致误判
//==================================================

function normalizeCookie(cookie) {

    return cookie
        .split(";")
        .map(i => i.trim())
        .sort()
        .join("; ");

}


const currentCookie =
    normalizeCookie(newCookie);


//==================================================
// 读取旧Cookie
//==================================================

const oldCookie =
    $persistentStore.read(COOKIE_KEY);


const oldNormalize =
    oldCookie ? normalizeCookie(oldCookie) : "";


//==================================================
// 判断变化
//==================================================

if (currentCookie === oldNormalize) {

    console.log("[Dounai] Cookie未变化");

    $done({});
}


//==================================================
// 保存
//==================================================

$persistentStore.write(
    newCookie,
    COOKIE_KEY
);


console.log("[Dounai] 登录Cookie更新");


$notification.post(
    "Dounai",
    "Cookie更新成功",
    "已保存登录状态"
);


//==================================================
// 结束
//==================================================

$done({});
