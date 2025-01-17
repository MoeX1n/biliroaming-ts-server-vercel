//Next Type Begin
/**
 * Make all properties in T optional
 */
type Partial<T> = {
  [P in keyof T]?: T[P];
};
/**
 * Object of `cookies` from header
 */
type cookies = Partial<{
  [key: string]: string;
}>;
//Next Type End

import qs from "qs";
import { md5 } from "hash-wasm";
import * as env from "../_config";

const loggerc = env.logger.child({ action: "调用组件(_bili)" });

const sorted = (params) => {
  const map = new Map();
  for (let k in params) {
    map.set(k, params[k]);
  }
  const arr = Array.from(map).sort();
  let obj = {};
  for (let i in arr) {
    let k = arr[i][0];
    let value = arr[i][1];
    obj[k] = value;
  }
  return obj;
};

/**
 * Bilibili APP API 签名
 * @param params JSON 原请求数据
 * @param appkey 可不填
 * @param appsec 可不填
 */
export const appsign = (
  params: any,
  appkey = "27eb53fc9058f8c3",
  appsec = "c2ed53a74eeefe3cf99fbd01d8c9c375"
): string => {
  params.appkey = appkey;
  params = sorted(params);
  const query = qs.stringify(params);
  const sign = md5(query + appsec);
  params.sign = sign;
  const to_return = qs.stringify(params);
  const log = loggerc.child({
    module: "Bilibili APP API 签名",
  });
  log.info({});
  log.debug({ context: to_return });
  return to_return;
};

/**
 * 通过WEB端Cookies获取APP端access_key(IOS APPKEY)
 * @param cookies WEB端Cookies
 */

export const cookies2access_key = async (cookies: {
  SESSDATA: string;
  DedeUserID: string;
}) => {
  const log = loggerc.child({
    module: "通过WEB端Cookies获取APP端access_key(IOS APPKEY)",
  });
  if (!cookies.SESSDATA || !cookies.DedeUserID) {
    log.info({ status: "Failed" });
    return;
  }
  /* const sign = md5(
    "api=http://link.acg.tv/forum.php" + "c2ed53a74eeefe3cf99fbd01d8c9c375"
  ); */
  const uri = await fetch(
    env.api.main.web.third_login +
      "/login/app/third?appkey=27eb53fc9058f8c3&api=http://link.acg.tv/forum.php&sign=67ec798004373253d60114caaad89a8c",
    {
      headers: {
        "User-Agent": env.UA,
        cookie: `DedeUserID=${cookies.DedeUserID}; SESSDATA=${cookies.SESSDATA}`,
      },
    }
  )
    .then((res) => res.json())
    .then(
      (res: {
        code: number;
        status: boolean;
        ts: number;
        data: {
          api_host: string;
          has_login: 0 | 1;
          direct_login?: 0 | 1;
          user_info?: { mid: string; uname: string; face: string };
          confirm_uri?: string;
        };
      }) => {
        if (res.code !== 0 || !res?.data?.confirm_uri) {
          log.info({ status: "Failed" });
          return;
        }
        return res.data.confirm_uri;
      }
    );
  if (!uri) {
    log.info({ status: "Failed" });
    return;
  }
  return await fetch(uri, {
    redirect: "manual",
    headers: {
      "User-Agent": env.UA,
      cookie: `DedeUserID=${cookies.DedeUserID}; SESSDATA=${cookies.SESSDATA}`,
    },
  }).then((res) => {
    const url = res.headers.get("Location");
    if (!url) return;
    const to_return = new URL(url).searchParams.get("access_key");
    log.info({ status: "Success" });
    log.debug({ context: to_return });
    return to_return;
  });
};

/**
 * 通过access_key查询个人信息
 * @param access_key Bilibili access key \
 * 查询不到，返回为 无会员(0,0)
 */
export const access_key2info = async (access_key: string) => {
  const log = loggerc.child({
    module: "通过access_key查询个人信息",
  });
  return await fetch(
    env.api.main.app.user_info +
      "/x/v2/account/myinfo?" +
      appsign({ access_key: access_key, ts: Date.now() }),
    env.fetch_config_UA
  )
    .then((res) => res.json())
    .then((res: { data?: any; code: number }) => {
      let to_return = {
        uid: 0,
        vip_type: 0 as 0 | 1 | 2,
      };
      if (res.code === 0) {
        const data = res.data;
        to_return = {
          uid: Number(data.mid),
          vip_type: Number(data.vip.type) as 0 | 1 | 2, //TODO 没有加类型判断校验
        };
      }
      log.info({});
      log.debug({ context: to_return });
      return to_return;
    });
};

/**
 * 通过含access_key及sign的Params查询个人信息
 * @param params 字符串的params，如 ?access_key=xxx&sign=xxx \
 * 查询不到，返回为 无会员(0,0)
 */
export const access_keyParams2info = async (params: string) => {
  const log = loggerc.child({
    module: "通过含access_key及sign的Params查询个人信息",
  });
  return await fetch(
    env.api.main.app.user_info + "/x/v2/account/myinfo" + params,
    env.fetch_config_UA
  )
    .then((res) => res.json())
    .then((res: { data?: any; code: number }) => {
      let to_return = {
        uid: 0,
        vip_type: 0 as 0 | 1 | 2,
      };
      if (res.code === 0) {
        const data = res.data;
        to_return = {
          uid: Number(data.mid),
          vip_type: Number(data.vip.type) as 0 | 1 | 2, //TODO 没有加类型判断校验
        };
      }
      log.info({});
      log.debug({ context: to_return });
      return to_return;
    });
};

/**
 * 通过cookie查询mid/vip
 * @param cookies Bilibili cookies \
 * 查询不到，返回为 无会员(0,0)
 */
export const cookies2info = async (cookies: { SESSDATA: string }) => {
  const log = loggerc.child({
    module: "通过cookie查询mid/vip",
  });
  if (!cookies.SESSDATA) {
    log.info({ status: "Failed" });
    return;
  }
  return await fetch(env.api.main.web.user_info + "/x/vip/web/user/info?", {
    headers: { "User-Agent": env.UA, cookie: "SESSDATA=" + cookies.SESSDATA },
  })
    .then((res) => res.json())
    .then(
      (res: { data?: { mid: number; vip_type: 0 | 1 | 2 }; code: number }) => {
        let to_return = {
          uid: 0,
          vip_type: 0 as 0 | 1 | 2,
        };
        if (res.code === 0) {
          const data = res.data;
          to_return = {
            uid: Number(data.mid),
            vip_type: Number(data.vip_type) as 0 | 1 | 2, //TODO 没有加类型判断校验
          };
        }
        log.info({});
        log.debug({ context: to_return });
        return to_return;
      }
    );
};

/**
 * 获取Bilibili网页版Cookies \
 * 默认：游客Cookies \
 * @param link 欲获取Cookies之链接
 */
export const getCookies = async (uri = "https://www.bilibili.com/") => {
  const log = loggerc.child({
    module: "获取Bilibili网页版Cookies(游客)",
  });
  return await fetch(uri, env.fetch_config_UA)
    .then((res) => {
      //代码来源
      /*本文作者： cylee'贝尔塔猫
      本文链接： https://www.cnblogs.com/CyLee/p/16170228.html
      关于博主： 评论和私信会在第一时间回复。或者直接私信我。
      版权声明： 本博客所有文章除特别声明外，均采用 BY-NC-SA 许可协议。转载请注明出处！*/

      // 获取 cookie
      const cookie = res.headers.get("set-cookie") || "";
      // 清理一下 cookie 的格式，移除过期时间，只保留基础的键值对才能正常使用
      const real_cookie = cookie
        .replace(/(;?)( ?)expires=(.+?);\s/gi, "")
        .replace(/(;?)( ?)path=\/(,?)(\s?)/gi, "")
        .replace(
          /(;?)( ?)domain=(.?)([a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\.?)/gi,
          ""
        )
        .replace(/,/gi, ";")
        .trim();
      const to_return = real_cookie;
      log.info({});
      log.debug({ context: to_return });
      return to_return;
    })
    .catch((err) => console.error(err));
};

export const cookies2usable = (cookies: cookies) => {
  let usable_cookies = "";
  for (const [key, val] of Object.entries(cookies)) {
    usable_cookies += key + "=" + val + ";";
  }
  return usable_cookies;
};
