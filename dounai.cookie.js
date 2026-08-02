const newCookie = $request.headers["Cookie"] || $request.headers["cookie"];
const oldCookie = $persistentStore.read("dounai_cookie");

if (!newCookie || newCookie === oldCookie) {
    $done({});
}

$persistentStore.write(newCookie, "dounai_cookie");
$notification.post("Dounai", "Cookie 更新成功", "");
$done({});
