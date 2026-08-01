if (typeof $request !== "undefined") {

    const cookie =
    $request.headers["Cookie"] ||
    $request.headers["cookie"];

    if (cookie) {

        $persistentStore.write(
            cookie,
            "dounai_cookie"
        );

        $notification.post(
            "Dounai",
            "Cookie更新成功",
            ""
        );
    }
}

$done({});
