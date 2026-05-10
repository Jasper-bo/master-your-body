function getLogoutRevocationTarget(refreshToken) {
  if (refreshToken) {
    return {
      kind: "current-token",
      refreshToken,
    };
  }

  return {
    kind: "none",
  };
}

module.exports = {
  getLogoutRevocationTarget,
};
