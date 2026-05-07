import React, { Component } from "react";
import Divider from "@material-ui/core/Divider";
import {
  Paper,
  Grid,
  Tooltip,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  Avatar,
  TableBody,
} from "@material-ui/core";
import Box from "@material-ui/core/Box";
import classNames from "classnames";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import { image_formats } from "Containers/Expenses/Constants";
import { withRouter } from "react-router-dom";
import { Actions } from "Constants/permissions";

class ProfileFormInfo extends Component {
  constructor(props) {
    super(props);

    this.state = {
      largeImagePreview: "",
    };
  }

  handleLargePreview = (extension, image) => {
    if (image_formats.includes(extension)) {
      this.setState({
        largeImagePreview: image,
      });
    } else {
      window.open(image);
    }
  };

  handleCloseLargeImage = () => {
    this.setState({
      largeImagePreview: "",
    });
  };

  handleTableFormat = (data) => {
    const handleSiblingRedirect = (studentId) => {
      if (studentId) {
        let studentDetail = {
          studentId: studentId,
        };
        let searchParam = "?" + new URLSearchParams(studentDetail).toString();
        this.props.history.push({
          pathname: Actions.general_student.view.url,
          search: searchParam,
          state: { detail: studentId },
        });
      }
    };

    return (
      <div>
        {data.column_data && data.column_data.length > 0 && (
          <TableContainer className="add-sibling-table header-align m-b-60px">
            <Table
              size="small"
              aria-label="simple table"
              className="exam-mark-row-table"
            >
              <TableHead>
                <TableRow className="">
                  {data.column_data.map((col, colIndex) => {
                    return (
                      <TableCell key={colIndex} className="selectable-table-head text-align-center">
                        {col.label}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.row_data &&
                  data.row_data.map((row, rowIndex) => {
                    return (
                      <TableRow
                        key={rowIndex}
                        className={data.is_sibling_table ? "sibling-row-clickable" : ""}
                        onClick={() => {
                          if (data.is_sibling_table && row.student_id) {
                            handleSiblingRedirect(row.student_id);
                          }
                        }}
                        style={{
                          cursor: data.is_sibling_table ? "pointer" : "default",
                        }}
                        onMouseEnter={(e) => {
                          if (data.is_sibling_table) {
                            e.currentTarget.style.backgroundColor = "#f5f5f5";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (data.is_sibling_table) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        {data.column_data.map((col, colIndex) => {
                          return (
                            <TableCell key={colIndex} className="text-align-center">
                              {row[col["name"]]}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                {(!data.row_data || data.row_data.length == 0) && (
                  <TableRow className="">
                    <TableCell
                      className="text-align-center"
                      colSpan={data.column_data.length}
                    >
                      No Data
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </div>
    );
  };

  handleViewImage = (image) => {
    this.setState({
      largeImagePreview: image,
    })
  };

  handleViewImage = (image) => {
    this.setState({
      largeImagePreview: image,
    })
  };

  return_field_value = (data) => {
    let isImage = false
    if (data.type === 'image') {
      isImage = true
    }
    let temp = '';
    if (isImage && !data.value) {
      temp = <Avatar/>
    } else if (isImage && data.value) {
      temp = (
        <img
          src={data.value}
          onClick={() => this.handleViewImage(data.value)}
          style={{ cursor: 'pointer', maxWidth: '50px', maxHeight: '50px' }}
        />
      );
    } else if (!isImage && !data.value) {
      temp = <Box style={{ width: "40px" }}>
        <hr />
      </Box>
    } else if (!isImage && data.value !== "") {
      temp = data.value
    }
    return (
      <Box
        display="flex"
        justifyContent="flex-start"
        className={classNames(data.className, 'dataValue break-word')}
      >
        {temp}
      </Box>
    );
  }

  render() {
    let { largeImagePreview } = this.state;
    const { profile_heading, profile_data, profile } = this.props;
    return (
      <Paper>
        {largeImagePreview && (
          <Box className="set-question-large-image-preview-box">
            <img
              src={largeImagePreview}
              alt="Image Preview"
              className="set-question-large-image-preview"
            />
            <Tooltip title="Close Image" placement="top-start">
              <Box
                className="set-question-large-image-remove-icon-box"
                onClick={this.handleCloseLargeImage}
              >
                <HighlightOffIcon className="set-question-large-image-remove-icon" />
              </Box>
            </Tooltip>
          </Box>
        )}
        <Grid container>
          {profile !== 0 && (
            <Grid item md={12}>
              <Grid item md={12}>
                <Box className="listName">{profile_heading[profile].value}</Box>
                <Divider light />
              </Grid>
              <Grid item xs={12}>
                <Box className="listContent">
                  {profile_data[profile].map((profData, index) => {
                    return (
                      <div key={index}>
                        <Paper className="profile-dataPaper">
                          <Box display="flex" justifyContent="flex-end">
                            <Box className="profile-sub-headings">
                              {profData.sub_heading}
                              <br />
                            </Box>
                          </Box>
                          <Grid container className="profileDetail">
                            {profData.data.map((data, index) => {
                              return (
                                <Grid
                                  key={index}
                                  item
                                  md={data.label ? data?.md ?? 4 : 0}
                                  xs={data.label ? 6 : 0}
                                >
                                  {data.label && (
                                    <Grid container className="DataLabel">
                                      <Grid item md={12} xs={12}>
                                        <Box
                                          display="flex"
                                          justifyContent="flex-start"
                                          className="dataLabel break-word"
                                        >
                                          {data.label}
                                        </Box>
                                      </Grid>
                                      <Grid item md={12} xs={12}>
                                        {!data.list && !data.table && (
                                          <Box
                                            display="flex"
                                            justifyContent="flex-start"
                                            className={classNames(
                                              data.className,
                                              "dataValue break-word"
                                            )}
                                          >
                                            {!data.value && (
                                              <Box style={{ width: "40px" }}>
                                                <hr />
                                              </Box>
                                            )}
                                              {data.value !== "" && data.value &&
                                              this.return_field_value(data)}
                                          </Box>
                                        )}
                                        {data.list && (
                                          <div>
                                            {data.value.map((listData) => {
                                              return (
                                                <div className="display-flex justify-content-space-between">
                                                  <div className="dataValue break-word">
                                                    {listData.name}
                                                  </div>
                                                  <Box className="set-question-image-list-box">
                                                    {listData.imagesPreview &&
                                                      listData.imagesPreview.map(
                                                        (temp, index) => {
                                                          return (
                                                            <Box className="set-question-image-preview-outer-box">
                                                              <Tooltip
                                                                title="Preview Image"
                                                                placement="top-start"
                                                              >
                                                                <>
                                                                  {image_formats.includes(
                                                                    temp.file_extension
                                                                  ) && (
                                                                    <img
                                                                      src={
                                                                        temp.url
                                                                      }
                                                                      alt="image"
                                                                      className="document_list-uploaded-image"
                                                                    />
                                                                  )}
                                                                  {temp.file_extension ===
                                                                    "pdf" && (
                                                                    <Box className="view-details-file-pdf-icon">
                                                                      <i class="fa fa-file-pdf-o" />
                                                                    </Box>
                                                                  )}
                                                                </>
                                                              </Tooltip>
                                                              <Box
                                                                onClick={() =>
                                                                  this.handleLargePreview(
                                                                    temp.file_extension,
                                                                    temp.url
                                                                  )
                                                                }
                                                                className="set-question-image-preview-icon"
                                                              >
                                                                <VisibilityOutlinedIcon />{" "}
                                                              </Box>
                                                            </Box>
                                                          );
                                                        }
                                                      )}
                                                  </Box>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                        {data.table &&
                                          this.handleTableFormat(data)}
                                      </Grid>
                                    </Grid>
                                  )}
                                </Grid>
                              );
                            })}
                          </Grid>
                        </Paper>
                      </div>
                    );
                  })}
                </Box>
              </Grid>
            </Grid>
          )}
        </Grid>
      </Paper>
    );
  }
}

export default withRouter(ProfileFormInfo);
