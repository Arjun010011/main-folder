import React, { Component } from "react";
import { Paper, Box, CircularProgress, Grid } from "@material-ui/core";

import { dateFormat } from "Includes/functions";
import Avatar from "images/blank_profile_pic.png";
import PersonIcon from "@material-ui/icons/Person";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { checkToday } from "Includes/functions";
import "./styles.scss";

export default class StaffLeaveList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      leaveList: [],
      loadMore: false,
      numberOfStaffs: 10,
      maxReach: false,
      loadMoreLoading: false,
    };
  }

  updateLeaveList = (number) => {
    const ll_url = GET_URL.staffleavelist.api;
    let params = { limit: number, exceptLoggedInUser: true };
    getRequest(ll_url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        if (this.state.leaveList.length === response.data.data.length) {
          this.setState({
            maxReach: true,
          });
        } else {
          this.setState({
            leaveList: response.data.data,
            loadMoreLoading: false,
          });
        }
        this.props.loadingFalse();
      }
    });
  };

  componentDidMount() {
    this.updateLeaveList(4);
  }

  loadMore = () => {
    this.setState({
      loadMore: true,
      loadMoreLoading: true,
      numberOfStaffs: this.state.numberOfStaffs + 10,
    });
    this.updateLeaveList(this.state.numberOfStaffs);
  };
  render() {
    const { leaveList, loadMore, maxReach, loadMoreLoading } = this.state;
    return (
      <Paper className="LeaveTodayPaper">
        <Grid container>
          <Grid item md={12} className="whoIsLeaveHeading">
            <PersonIcon style={{ fontSize: "40px" }} />
            <Box paddingTop="6px">Who is on Leave Today</Box>
          </Grid>
        </Grid>
        <Grid container className="staff-list-height">
          <Grid item md={12}>
            {leaveList.map((date, dateIndex) => {
              return (
                <Box>
                  {(dateIndex < 4 || loadMore) && (
                    <Box>
                      <Box borderBottom="inset" mt={2} mb={2}></Box>
                      <Box
                        style={{
                          color: "rgba(0, 0, 0, 0.75)",
                          fontSize: "15px",
                        }}
                      >
                        {(e) => checkToday(date.fodate)}
                      </Box>
                      {date.leave_detail.map((staffs, staffindex) => {
                        return (
                          <Box display="flex" alignItems="center">
                            {staffs.profile_pic_details["file"] && (
                              <Box>
                                <img
                                  src={staffs.profile_pic_details["file"]}
                                  alt="Profile Pic"
                                  style={{
                                    borderRadius: "50%",
                                    width: "60px",
                                    height: "60px",
                                    margin: "6px",
                                  }}
                                />
                              </Box>
                            )}
                            {!staffs.profile_pic_details["file"] && (
                              <Box mt={1}>
                                <img
                                  src={Avatar}
                                  alt="Profile Pic"
                                  style={{
                                    borderRadius: "50%",
                                    width: "70px",
                                    height: "70px",
                                  }}
                                />
                              </Box>
                            )}
                            <Box ml={1}>
                              <Box
                                color="#464D68"
                                fontWeight="bold"
                                fontSize="15px"
                              >
                                {staffs.staff_name}
                              </Box>
                              <Box color="#464D68" fontSize="13px"></Box>
                            </Box>
                            {(staffs.from_session === staffs.to_session) ===
                              "Session1" && <Box>Morning</Box>}
                            {(staffs.from_session === staffs.to_session) ===
                              "Session2" && <Box>Afternoon</Box>}
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Grid>
        </Grid>
        {!maxReach && !loadMoreLoading && (
          <Box className="loadMore" onClick={this.loadMore}>
            Click here for Load more
          </Box>
        )}
        {loadMoreLoading && !maxReach && (
          <Box className="loadMore">
            <CircularProgress />
          </Box>
        )}
      </Paper>
    );
  }
}
