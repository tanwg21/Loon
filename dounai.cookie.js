/**************************************************
 * 名称：Dounai Cookie获取
 * 作者：tanwg21
 * 版本：1.0.0
 * 更新时间：2026-08-02
 **************************************************/

//==================================================
// 配置
//==================================================

const COOKIE_KEY = "dounai_cookie";

//==================================================
// 获取 Cookie
//==================================================

const newCookie =
    $request.headers["Cookie"] ||
    $request.headers["cookie"];

if (!newCookie) {
    console.log("[Dounai] 未获取到Cookie");
    $done({});
}

//==================================================
// 读取旧 Cookie
//==================================================

const oldCookie = $persistentStore.read(COOKIE_KEY);

console.log("[Dounai] 新Cookie：" + newCookie);
console.log("[Dounai] 旧Cookie：" + oldCookie);

//==================================================
// 判断 Cookie 是否变化
//==================================================

if (oldCookie === newCookie) {

    console.log("[Dounai] Cookie未变化");

    $done({});
}

//==================================================
// 保存 Cookie
//==================================================

$persistentStore.write(newCookie, COOKIE_KEY);

console.log("[Dounai] Cookie已更新");

$notification.post(
    "Dounai",
    "Cookie 更新成功",
    ""
);

//==================================================
// 结束
//==================================================

$done({});
