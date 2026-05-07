import { useState } from "react";
import React from "react";
import { AsyncPaginate } from "react-select-async-paginate";
import { Actions } from "Constants/permissions";
import { loadOptions } from "./loadOptions";
import { withRouter } from "react-router-dom";
import { getProfileTab, isMobile } from "Includes/functions";
import { Tooltip } from "@material-ui/core";

const isMobileScreen = isMobile();

function DropDownWithSearchApi(props) {
  const { className, onStudentChange, extra_param, sendBranch } = props;
  const loadPageOptions = async (q, prevOptions, { page }) => {
    const { options, hasMore } = await loadOptions(
      q,
      page,
      prevOptions,
      extra_param,
      sendBranch
    );
    return {
      options,
      hasMore,
      additional: {
        page: page + 1,
      },
    };
  };
  const [value, onChange] = useState(null);

  const handleChange = (student) => {
    onStudentChange(student);
    onChange(() => null);
  };

  return (
    <div>
      <div
        className={isMobileScreen ? "width-100-px mr-20" : `${className} mr-20`}
        style={{ color: "black", cursor: "text" }}
      >
        <AsyncPaginate
          additional={{ page: 0 }}
          value={value}
          loadOptions={loadPageOptions}
          onChange={handleChange}
          placeholder={
            isMobileScreen
              ? "Student"
              : "Student search by name, mobile, admission"
          }
        />
      </div>
    </div>
  );
}

export default withRouter(DropDownWithSearchApi);
