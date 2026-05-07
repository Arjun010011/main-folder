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
  const url = GET_URL.student.api;
  props["dontSendBranch"] = sendBranch;
  if (extra_param) {
    params = { ...params, ...extra_param };
  }
  await getRequest(url, params, props).then(async (response) => {
    if (response && response.status === 200) {
      response.data.data.student_list.map((data) => {
        data["value"] = data["id"];
        data["label"] = `${getFullName(
          data["first_name"],
          data["middle_name"],
          data["last_name"]
        )} - ${data?.["admission_num"] ?? ""} - ${
          data?.current_standard_name ?? ""
        } ${data?.current_standard_section_name ? "[" : ""}${
          data?.current_standard_section_name
            ? data?.current_standard_section_name
            : ""
        }${data?.current_standard_section_name ? "]" : ""}`;
      });
      filteredOptions = response.data.data.student_list;
      hasMore = response.data.data.next ? true : false;
    }
  });
  return {
    options: filteredOptions,
    hasMore,
  };
};
