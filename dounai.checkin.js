const log = (msg) => {
    console.log("[Dounai] " + msg);
};

log("开始执行签到");

const cookie = $persistentStore.read("dounai_cookie");

if (!cookie) {

    log("未找到Cookie");

    $notification.post(
        "❌ Dounai",
        "Cookie不存在",
        "请打开用户中心重新获取"
    );

    $done();
}

log("Cookie读取成功");


$httpClient.post({

    url: "https://dounai.pro/user/checkin",

    headers: {
        Cookie: cookie,
        Origin: "https://dounai.pro",
        Referer: "https://dounai.pro/user/panel",
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "User-Agent": "Mozilla/5.0"
    }

}, function(error, response, data) {


    if(error){

        log("请求失败：" + error);

        $notification.post(
            "❌ Dounai",
            "网络错误",
            error
        );

        return $done();
    }


    log("请求完成 HTTP：" + response.status);


    try {

        const obj = JSON.parse(data);

        log("JSON解析成功");

        log("服务器返回：" + obj.msg);


        if(obj.ret == 1){

            log("签到成功");

            $notification.post(
                "✅ Dounai",
                "签到成功",
                obj.msg
            );


        }else if(obj.msg && obj.msg.includes("续过命")){

            log("今日已经签到");

            $notification.post(
                "ℹ️ Dounai",
                "今天已签到",
                obj.msg
            );


        }else{

            log("签到失败");

            $notification.post(
                "❌ Dounai",
                "签到失败",
                obj.msg || data
            );

        }


    }catch(e){

        log("JSON解析失败：" + e);

        $notification.post(
            "❌ Dounai",
            "解析失败",
            data
        );

    }


    log("脚本执行结束");

    $done();

});
