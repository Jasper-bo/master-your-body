class ApiClientError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function createApiRequester({ fetchImpl = fetch } = {}) {
  let refreshPromise = null;

  async function refreshSession() {
    refreshPromise ??= (async () => {
      const response = await fetchImpl("/api/auth/refresh", {
        method: "POST",
        credentials: "same-origin",
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new ApiClientError(
          json?.error?.message ?? "登录状态已过期，请重新登录",
          response.status,
          json?.error?.code,
        );
      }
    })().finally(() => {
      refreshPromise = null;
    });

    await refreshPromise;
  }

  async function request(path, init = {}, options = {}, hasRetried = false) {
    const headers = new Headers(init.headers);

    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json");
    }

    headers.delete("Authorization");

    const response = await fetchImpl(path, {
      ...init,
      credentials: init.credentials ?? "same-origin",
      headers,
    });
    const json = await response.json();

    if (json.success) {
      return json.data;
    }

    const error = new ApiClientError(
      json.error.message,
      response.status,
      json.error.code,
    );

    if (
      options.auth &&
      response.status === 401 &&
      !hasRetried &&
      path !== "/api/auth/refresh"
    ) {
      try {
        await refreshSession();
      } catch {
        throw error;
      }

      return request(path, init, options, true);
    }

    throw error;
  }

  return request;
}

module.exports = {
  ApiClientError,
  createApiRequester,
};
