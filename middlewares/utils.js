const API = process.env.API;
const fetch = require("node-fetch");

module.exports.accountInfoByEmail = async (email) => {
  let data;
  await fetch(API + `/accounts/info/${email}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })
    .then(async (result) => {
      data = await result.json();
    })
    .catch((error) => {
      data = {
        code: 0,
        success: false,
        message: error.message,
      };
      return data;
    });
  return data;
};

module.exports.getRecipebyAccId = async (accountid) => {
  let data;
  await fetch(API + "/recipes/all", {
    method: "GET",
    headers: { "Content-Type": "application/json", accountid: accountid },
  })
    .then(async (result) => {
      data = await result.json();
    })
    .catch((error) => {
      data = {
        code: 0,
        success: false,
        message: error.message,
      };
    });
  return data;
};
