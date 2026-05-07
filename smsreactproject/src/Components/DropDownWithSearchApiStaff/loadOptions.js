import { cloneDeep } from "lodash";
import { DEFAULT_PAGINATION_PROPS } from "Constants";
import { getPaginationProps, getFullName } from "Includes/functions";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";

export const loadOptions = async (search, page, props, extra_param, sendBranch=true) => {
  let filteredOptions = [];
  let hasMore = false;
  let pagination = {
    searchText: search,
    page: page,
    rowsPerPage: 10,
    sortOrder: { name: "first_name" },
  };
  let pagination_params = getPaginationProps(pagination);
  let params = { ...pagination_params, is_active: true };
  const url = GET_URL.staff.api;
  props["dontSendBranch"] = sendBranch;
  if (extra_param) {
    params = { ...params, ...extra_param };
  }
  await getRequest(url, params, props).then(async (response) => {
    if (response && response.status === 200) {
      response.data.data.map((data) => {
        data["value"] = data["id"]
        data["label"] = data["full_name"]
      });
      filteredOptions = response.data.data;
      hasMore = response.data.next ? true : false;
    }
  });
  return {
    options: filteredOptions,
    hasMore,
  };
};
