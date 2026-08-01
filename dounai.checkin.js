const cookie = $persistentStore.read("dounai_cookie");

if (!cookie) {

    $notification.post(
        "Dounai",
        "Cookie不存在",
        "请打开一次用户中心"
    );

    $done();
}


$httpClient.post({

    url:"https://dounai.pro/user/checkin",

    headers:{
        Cookie:cookie,
        Origin:"https://dounai.pro",
        Referer:"https://dounai.pro/user/panel",
        "X-Requested-With":"XMLHttpRequest",
        Accept:"application/json, text/javascript, */*; q=0.01",
        "User-Agent":"Mozilla/5.0"
    }

},function(error,response,data){

    if(error){

        $notification.post(
            "Dounai",
            "签到失败",
            error
        );

        return $done();
    }


    try{

        let obj=JSON.parse(data);


        if(obj.ret==1){

            $notification.post(
                "Dounai签到成功",
                "",
                obj.msg
            );

        }else{

            $notification.post(
                "Dounai签到",
                "失败",
                obj.msg
            );

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
