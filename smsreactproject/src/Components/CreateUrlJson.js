import React, { Component } from "react";
import { Actions, screenTypes } from "Constants/permissions";
import { GET_URL, POST_URL, PUT_URL, PATCH_URL, DEL_URL } from "Includes/urls";
import { postRequest, putRequest } from "Includes/api/apicall";
import _ from "lodash";

import { getMobileApplicationSetting } from "Containers/GroupsPermissions/functions";
import { getLocalStorageDetails } from "Includes/functions";
import { getRequest } from "Includes/api/apicall";
class CreateUrlJson extends Component {
  constructor(props) {
    super(props);
    this.state = {
      errors: [],
    };
  }
  async componentDidMount() {
    const user = getLocalStorageDetails("user", "object");
    if (!user.is_superuser) {
      window.location = "/";
    }
  }

  updatePermissions = () => {
    const url = GET_URL.permissionlist.api;
    const params = { is_active: true, menu_type: "mobile" };
    getRequest(url, params, {}).then((response) => {
      if (response && response.status === 200) {
        let mobileAppActions = getMobileApplicationSetting(response.data.data);
        let permissionListCodeNames = {
          screen_name: [],
          app_screen_name: [],
          staff_app_screen_name: [],
        };
        let permissionList = {};
        let urls = [];
        let errors = [];
        this.setState({ errors: [] });
        for (let code in Actions) {
          let temp = {};
          temp["new_code"] = code;
          temp["old_code"] = code;
          if (Actions[code]["old_code"]) {
            temp["old_code"] = Actions[code]["old_code"];
          }
          permissionListCodeNames["screen_name"].push(temp);
          //validation
          if (!Actions[code].hasOwnProperty("name")) {
            errors.push(`In ${code}: name field not found`);
          }

          if (!Actions[code].hasOwnProperty("type")) {
            errors.push(`In ${code} : type field not found`);
          }
          for (let [screenType, screenData] of Object.entries(Actions[code])) {
            if (screenTypes.includes(screenType)) {
              permissionList[screenData["action_code"]] =
                screenData["codenames"];
              if (
                screenData.hasOwnProperty("url") &&
                screenData.hasOwnProperty("action") &&
                screenData["action"] === "sub-menu"
              ) {
                let label = screenData["label"];
                if (
                  typeof label &&
                  label["props"] &&
                  label["props"]["defaultMessage"]
                ) {
                  label = label["props"]["defaultMessage"];
                }
                let temp1 = {
                  path: screenData["url"],
                  menu_name: screenData["label"],
                  menu_type: "web",
                  description: screenData["name"],
                  old_path: screenData["old_path"]
                    ? screenData["old_path"]
                    : screenData["url"],
                };
                urls.push(temp1);
              }
              //validation
              if (!screenData.hasOwnProperty("name")) {
                errors.push(`In ${code} - ${screenType}: name field not found`);
              }

              if (!screenData.hasOwnProperty("label")) {
                errors.push(
                  `In ${code} - ${screenType}: label field not found`
                );
              }

              if (
                screenData.hasOwnProperty("permission_needed") &&
                Boolean(screenData.permission_needed) &&
                !screenData.hasOwnProperty("action_code")
              ) {
                errors.push(
                  `In ${code} - ${screenType}: action_code field not found`
                );
              }

              if (!screenData.hasOwnProperty("action")) {
                errors.push(
                  `In ${code} - ${screenType}: action field not found`
                );
              }

              if (
                screenData.hasOwnProperty("action") &&
                ["sub-menu", "action-url"].includes(screenData["data"]) &&
                !screenData.hasOwnProperty("url")
              ) {
                errors.push(`In ${code} - ${screenType}: url field not found`);
              }

              if (
                screenData.hasOwnProperty("action") &&
                ["sub-menu", "action-url"].includes(screenData["data"]) &&
                !screenData.hasOwnProperty("component")
              ) {
                errors.push(
                  `In ${code} - ${screenType}: component field not found`
                );
              }
            }
          }
        }
        for (let codeM in mobileAppActions) {
          let temp = {};
          temp["new_code"] = codeM;
          temp["old_code"] = codeM;
          if (mobileAppActions[codeM]["old_code"]) {
            temp["old_code"] = mobileAppActions[codeM]["old_code"];
          }
          permissionListCodeNames["app_screen_name"].push(temp);
          for (let [screenType, screenData] of Object.entries(
            mobileAppActions[codeM]
          )) {
            if (screenTypes.includes(screenType)) {
              permissionList[screenData["action_code"]] =
                screenData["codenames"];
              if (
                screenData.hasOwnProperty("url") &&
                screenData.hasOwnProperty("action") &&
                screenData["action"] === "dash-screen"
              ) {
                let temp1 = {
                  path: screenData["url"],
                  menu_name: screenData["label"],
                  menu_type: "app",
                  description: screenData["name"],
                  old_path: screenData["old_path"]
                    ? screenData["old_path"]
                    : screenData["url"],
                };
                urls.push(temp1);
              } else {
                if (
                  !screenData.hasOwnProperty("action") &&
                  screenData.hasOwnProperty("permission_needed")
                ) {
                  errors.push(
                    `In ${codeM} - ${screenType}: action field not found`
                  );
                }
                if (
                  screenData.hasOwnProperty("action") &&
                  ["dash-screen"].includes(screenData["data"]) &&
                  !screenData.hasOwnProperty("url")
                ) {
                  errors.push(
                    `In ${codeM} - ${screenType}: url field not found`
                  );
                }
              }
            }
          }
        }
        const url = GET_URL.staffpermissionlist.api;
        const params = { is_active: true };
        getRequest(url, params, {}).then((response) => {
          let staffMobileAppActions = getMobileApplicationSetting(
            response.data.data,
            true
          );
          for (let codeM in staffMobileAppActions) {
            let temp = {};
            temp["new_code"] = codeM;
            temp["old_code"] = codeM;
            if (staffMobileAppActions[codeM]["old_code"]) {
              temp["old_code"] = staffMobileAppActions[codeM]["old_code"];
            }
            permissionListCodeNames["staff_app_screen_name"].push(temp);
            for (let [screenType, screenData] of Object.entries(
              staffMobileAppActions[codeM]
            )) {
              if (screenTypes.includes(screenType)) {
                permissionList[screenData["action_code"]] =
                  screenData["codenames"];
                if (
                  screenData.hasOwnProperty("url") &&
                  screenData.hasOwnProperty("action") &&
                  screenData["action"] === "dash-screen"
                ) {
                  let temp1 = {
                    path: screenData["url"],
                    menu_name: screenData["label"],
                    menu_type: "staff_app",
                    description: screenData["name"],
                    old_path: screenData["old_path"]
                      ? screenData["old_path"]
                      : screenData["url"],
                  };
                  urls.push(temp1);
                } else {
                  if (
                    !screenData.hasOwnProperty("action") &&
                    screenData.hasOwnProperty("permission_needed")
                  ) {
                    errors.push(
                      `In ${codeM} - ${screenType}: action field not found`
                    );
                  }
                  if (
                    screenData.hasOwnProperty("action") &&
                    ["dash-screen"].includes(screenData["data"]) &&
                    !screenData.hasOwnProperty("url")
                  ) {
                    errors.push(
                      `In ${codeM} - ${screenType}: url field not found`
                    );
                  }
                }
              }
            }
          }
          if (errors.length === 0) {
            let postCodeUrl = POST_URL.permissions.api;
            postRequest(postCodeUrl, permissionListCodeNames, this.props).then(
              (response) => {
                if (response && response.status === 200) {
                  alert("Success Code names");
                } else {
                  alert("Fail Code names");
                }
              }
            );
            let postPermissionUrl = PUT_URL.permissions.api + "1/";
            putRequest(postPermissionUrl, permissionList, this.props).then(
              (response) => {
                if (response && response.status === 200) {
                  alert("Success screen name");
                } else {
                  alert("Failed in screen name");
                }
              }
            );
            let postUrl = POST_URL.urlsmenu.api + "?menus_list=1";
            postRequest(postUrl, urls, this.props).then((response) => {
              if (response && response.status === 200) {
                alert("Success url list");
              } else {
                alert("Failed");
              }
            });
          } else {
            this.setState({ errors: errors });
          }
        });
      }
    });
  };

  requestCodenamesFunc = (request) => {
    let codenames = [];
    for (let data of Object.values(request)) {
      codenames.push(data);
    }
    return codenames;
  };
  render() {
    const { errors } = this.state;
    return (
      <>
        {errors.length > 0 && <h2 className="red-text"> Errors Found: </h2>}
        <ul>
          {errors.map((error, index) => {
            return <ul key={index}>{error}</ul>;
          })}
        </ul>
        <button onClick={() => this.updatePermissions()}>
          Update Web Permission
        </button>
      </>
    );
  }
}

export default CreateUrlJson;
