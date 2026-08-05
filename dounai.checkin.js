/**************************************************
 * 名称：Dounai 自动签到
 * 作者：tanwg21 & ChatGPT
 * 版本：2.2.0
 **************************************************/

const COOKIE_KEY = "dounai_cookie";

const cookie = $persistentStore.read(COOKIE_KEY);

if (!cookie) {
    $notification.post("Dounai", "Cookie不存在", "请重新登录");
    $done();
}

console.log("========== Cookie ==========");
console.log(cookie);
console.log("============================");

$httpClient.post(
{
    url: "https://dounai.pro/user/checkin",
    headers: {
        "Cookie": cookie,
        "Origin": "https://dounai.pro",
        "Referer": "https://dounai.pro/user/panel",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 Safari/604.1"
    }
},
(err, resp, data) => {

    console.log("HTTP：" + resp.status);
    console.log(data);

    if (err) {
        $notification.post("Dounai","网络错误",err);
        return $done();
    }

    try{

        const obj = JSON.parse(data);
        const msg = obj.msg || "";

        if (
            obj.ret == 1 &&
            msg.includes("获得了")
        ){
            $notification.post("✅ Dounai","签到成功",msg);
        }
        else if (
            msg.includes("已签到") ||
            msg.includes("续过命")
        ){
            $notification.post("ℹ️ Dounai","今天已签到",msg);
        }
        else{
            $notification.post("❌ Dounai","签到失败",msg);
        }

    }catch(e){

        $notification.post(
            "Dounai",
            "解析失败",
            data
        );
    }

    $done();

});
