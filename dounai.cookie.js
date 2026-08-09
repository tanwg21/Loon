/**************************************************
 * 名称：Dounai Cookie获取
 * 作者：tanwg21
 * 版本：1.2.0
 * 更新时间：2026-08-09
 * 功能：
 *   自动截获登录 Cookie (支持 14.137.237.0:1443)
 *   智能过滤未登录请求与关键字段校验
 *   Cookie 标准化与比对去重，避免重复打扰
 **************************************************/

const COOKIE_KEY = "dounai_cookie";

//==================================================
// 1. 获取并提取 Cookie
//==================================================

const reqHeaders = $request ? $request.headers : null;

if (!reqHeaders) {
    console.log("[Dounai Cookie] 异常：未检测到请求头");
    $done({});
}

// 兼容大小写 Header 字段
const rawCookie = reqHeaders["Cookie"] || reqHeaders["cookie"];

if (!rawCookie) {
    console.log("[Dounai Cookie] 忽略：当前请求未包含 Cookie 字段");
    $done({});
}

//==================================================
// 2. 校验登录关键凭证
//==================================================

// SSPANEL 核心登录凭证通常包含 uid, key 和 email (或 ip)
const isLoginCookie = 
    rawCookie.includes("uid=") && 
    rawCookie.includes("key=") && 
    (rawCookie.includes("email=") || rawCookie.includes("expire_in="));

if (!isLoginCookie) {
    console.log("[Dounai Cookie] 忽略：当前 Cookie 非有效登录状态");
    $done({});
}

//==================================================
// 3. Cookie 标准化 (按 key 排序，防顺序变动误判)
//==================================================

function normalizeCookie(cookieStr) {
    if (!cookieStr) return "";
    return cookieStr
        .split(";")
        .map(item => item.trim())
        .filter(item => item.length > 0) // 过滤空项
        .sort()
        .join("; ");
}

const currentNormalized = normalizeCookie(rawCookie);

//==================================================
// 4. 读取旧凭证并比对去重
//==================================================

const oldCookie = $persistentStore.read(COOKIE_KEY);
const oldNormalized = normalizeCookie(oldCookie);

if (currentNormalized === oldNormalized) {
    console.log("[Dounai Cookie] 忽略：Cookie 内容未发生变化");
    $done({});
}

//==================================================
// 5. 保存新 Cookie 并通知
//==================================================

const isSaved = $persistentStore.write(rawCookie, COOKIE_KEY);

if (isSaved) {
    console.log("[Dounai Cookie] 成功：新登录凭证已更新保存");
    console.log("[Dounai Cookie] Value: " + rawCookie);

    $notification.post(
        "Dounai 凭证更新",
        "🎉 Cookie 保存成功",
        "已自动更新 14.137.237.0:1443 的登录状态"
    );
} else {
    console.log("[Dounai Cookie] 失败：持久化写入 $persistentStore 失败");
    $notification.post("Dounai 凭证更新", "❌ 保存失败", "无法写入持久化存储");
}

//==================================================
// 6. 结束脚本
//==================================================

$done({});
