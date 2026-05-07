import React from "react";
import { withRouter } from "react-router-dom";
import { Grid, Paper, Box, Typography, Checkbox } from "@material-ui/core";
import "./../../../Components/SelectableRowTable/styles.scss";

class GroupViewTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const {
      bodyData,
      bodyDataKeys,
      checkedAll,
      checkRow,
      search_name,
      class_name,
    } = this.props;
    return (
      <>
        <table width="100%" className="selectable-row-table">
          <thead>
            <tr>
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
            </tr>
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
                          <td
                            key={ind}
                            className={`${key["textAlign"]} ${key["class_name"]}`}
                          >
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
                {/* <td> */}
                No Data Found
                {/* </td> */}
              </tr>
            )}
          </tbody>
        </table>
      </>
    );
  }
}
export default GroupViewTable;
