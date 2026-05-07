import React from "react";
import {  Box, Checkbox } from "@material-ui/core";

import "./styles.scss";

const SelectableRowTable = (props) => {
  const {
    bodyData,
    bodyDataKeys,
    checkedAll,
    checkRow,
  } = props;
  return (
    <>
      <table width="100%" className="selectable-row-table">
        <thead>
          <th className="selectable-table-head">
            <Box className="select-table-row">
              <Checkbox
                color="primary"
                checked={checkedAll}
                onChange={() => checkRow("all")}
              />
            </Box>
          </th>
          {bodyDataKeys.map((key, ind) => {
            if (key["show"])
              return (
                <th
                  key={ind}
                  className={`${key["textAlign"]} selectable-table-head`}
                >
                  {key["head"]}
                </th>
              );
          })}
        </thead>
        <tbody className="selectable-row-table-body">
          {bodyData.map((data, index) => {
            let checked = Boolean(data.checked);
            if (data["show"]) {
              return (
                <tr key={index} className="selectable-row-table-row">
                  <td>
                    <Box className="select-table-row">
                      <Checkbox
                        color="primary"
                        checked={checked}
                        value={checked}
                        onChange={() => checkRow(data)}
                      />
                    </Box>
                  </td>
                  {bodyDataKeys.map((key, ind) => {
                    if (key["show"])
                      return (
                        <td key={ind} className={`${key["textAlign"]}`}>
                          {data[key["name"]]}
                        </td>
                      );
                  })}
                </tr>
              );
            }
          })}
          {bodyData.length === 0 && (
            <tr className="text-center font-weight-bold">
              No Data Found
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
};
export default SelectableRowTable;
