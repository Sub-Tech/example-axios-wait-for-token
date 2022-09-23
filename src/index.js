import axios from "axios";
import axiosRetry from "axios-retry";

const authStorage = {
  token: "foobar",
  expires: new Date(),
  getExpiresAt: async function () {
    return new Promise((res, rej) => {
      setTimeout(() => {
        return res(authStorage.expires)
      }, 50)
    })
  },
  storeToken: async function (token, dt) {
    return new Promise((res, rej) => {
      authStorage.token = token
      authStorage.expires = dt
      setTimeout(() => {
        return res(true)
      }, 1000)
    })
  },
  getToken: async function () {
    return new Promise((res, rej) => {
      setTimeout(() => {
        res(authStorage.token)
      }, 50)
    })
  }
}


const _myAxiosErrFn = (error) => {
  if (error.response) {
    console.log(error.response)
  } else if (error.request) {

  } else {

  }

  return Promise.reject(error);
};

const _myAxioSuccessFn = (r) => {
  console.log("REQUEST SUCCESS INTERCEPTOR:", r.config.url, r.config.data, r.data)
  return r;
};

const onRequest = async (config) => {
  // before each request
  if (config.requires_auth) {
    const authToken = await authStorage.getToken();
    // auth header here incase we are retrying 500s and it is out of date on retries
    config.headers.authorization = `Bearer ${authToken}`,
    console.log("pre request", config.data.request_number)
    const time = await authStorage.getExpiresAt()
    console.log(`getting expires at for ${config.url} ${config.data.request_number}`)
    // Renew the auth token if its expired
    if (time && time <= new Date()) {
        console.log(`we need to update the token for ${config.url}, calling ?foo=bar to refresh`)
        return apiClient({
          url: "/testApi/token.json",
          method: 'get',
          data: {tokenForRequestNumber: config.data.request_number}
        }).then(async function (res) {
          const t = res.data.token
          console.log("new token is received for", config.data.request_number)
          console.log("waiting for store")
          await authStorage.storeToken(t, new Date());  // will take 1000ms
          console.log("token stored async we can return for", config.data.request_number)
          config.headers.authorization = t;
          return config;
        }).catch(function (e) {
          return config;
        });
    } else {
      return config
    }
  } else {
    return config;
  }
}

axios.interceptors.request.use(async (config) => await onRequest(config));
axios.interceptors.response.use(_myAxioSuccessFn, _myAxiosErrFn);

async function apiClient(requestConfig) {
  const defaultConfig = {
    baseURL: "./",
    method: "get",
    requires_auth: false,
  };

  const finalRequestConfig = {
    ...defaultConfig,
    ...requestConfig,
  };

  // axiosRetry(axios, {
  //   retryDelay: axiosRetry.exponentialDelay,
  //   retries: 5,
  //   onRetry: function () {
  //     console.log('retry');
  //   },
  //   retryCondition: function (err) {
  //     const message = (err && err.message) ? err.message : '';
  //     const found = ['404', '500'].filter((status) => {
  //       return message.indexOf(status) !== -1;
  //     })
  //     return found.length;
  //   }
  // });

  return axios(finalRequestConfig);
}

// simulated multiple page layer auth requests
[1,2,3].map((n) => {
  // console.time(`loopOf${n}`)
  setTimeout(() => {
    // console.timeEnd(`loopOf${n}`)
    console.time(`firing request ${n}`)
    console.log(`firing request ${n}`)
    apiClient({
      url: "/testApi/test.json",
      requires_auth: true,
      data: {
        request_number: n
      }
    }).then(res => {
      console.log(`local res success ${n}`, res)
      console.timeEnd(`firing request ${n}`)
    }).catch(err => {
      if (err.status === 401) {
        // redirect login
      }
      console.log(`local catch fail ${n}`, err)
    })
  }, 50*n)
})

;[4,5,6].map((n) => {
  // console.time(`loopOf${n}`)
  setTimeout(() => {
    // console.timeEnd(`loopOf${n}`)
    console.time(`firing request ${n}`)
    console.log(`firing request ${n}`)
    apiClient({
      url: "/testApi/test2.json",
      requires_auth: true,
      data: {
        request_number: n
      }
    }).then(res => {
      console.log(`local res success ${n}`, res)
      console.timeEnd(`firing request ${n}`)
    }).catch(err => {
      console.log(`local catch fail ${n}`, err)
    })
  }, 500*n)
})






