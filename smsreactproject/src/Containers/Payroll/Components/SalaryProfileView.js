import React, { Component } from "react";
import { Box, Grid, Paper, Avatar } from "@material-ui/core";

import { numberWithCommas, getFullName } from "Includes/functions";
import profile_Background from "images/profile_background.png";
import "./../styles.scss";
import moment from "moment";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";

class SalaryProfileView extends Component {
  render() {
    let { details, name } = this.props;
    let date_of_join = details.date_joined;
    date_of_join = moment(date_of_join);
    date_of_join = date_of_join.format("DD-MM-YYYY");
    return (
      <div>
        <Grid container>
          <Paper className="grid-card-width-300">
            <Paper className="grid-card-paper">
              <img
                src={profile_Background}
                className="grid-profile-background"
                alt="profile_Background"
              />
              {details.profile_pic_details && (
                <Box className="grid-profile-pic-position">
                  <Avatar
                    alt="Profile Pic"
                    src={details.profile_pic_details.file}
                    className="grid-profile-pic"
                  />
                </Box>
              )}
              {!details.profile_pic_details && (
                <Box className="grid-profile-pic-position">
                  <Avatar className="grid-profile-pic">
                    {details.first_name && details.first_name.charAt(0)}
                  </Avatar>
                </Box>
              )}
            </Paper>
            <Box className="grid-card-profile-name break-word">
              {getFullName(
                details.first_name,
                details.middle_name,
                details.last_name
              )}
            </Box>
            <Box className="salary-info-outer-box">
              <Box className="salary-info-inner-box">
                <Box className="salary-grid-card-label">
                  <FormattedMessage {...commonMessages.email} />
                </Box>
                <Box className="salary-grid-card-value">{details.email}</Box>
              </Box>
              <Box className="salary-info-inner-box">
                <Box className="salary-grid-card-label">
                  <FormattedMessage {...commonMessages.phoneNo} />
                </Box>
                <Box className="salary-grid-card-value">
                  {details.mobile_num}
                </Box>
              </Box>
              <Box className="salary-info-inner-box">
                <Box className="salary-grid-card-label">
                  <FormattedMessage {...commonMessages.joiningDate} />
                </Box>
                <Box className="salary-grid-card-value">{date_of_join}</Box>
              </Box>
              <Box className="salary-info-inner-box">
                <Box className="salary-grid-card-label">
                  <FormattedMessage {...commonMessages.designation} />
                </Box>
                <Box className="salary-grid-card-value">
                  {details.designation}
                </Box>
              </Box>
              <Box className="salary-info-inner-box">
                <Box className="salary-grid-card-label">
                  <FormattedMessage {...commonMessages.salary} />
                </Box>
                <Box className="salary-grid-card-value">
                  {numberWithCommas(details.salary)}
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </div>
    );
  }
}

export default SalaryProfileView;
